const mainController = require("../../libraries/mainController");
const common = require('../../libraries/common');
const moment = require('moment');
const ObjectID = require("../../types/object_id");
const cron = require('node-cron');
const { Client } = require('@elastic/elasticsearch');


const esClient = new Client({ node: 'http://143.198.140.3:9200' });

module.exports.cleanProductsQuantities = async function (req, res) {
    try {
        const collection = req.custom.db.collection("product");

        const results = await collection.update({
            variants: { $exists: true },
        }, [
            {
                $set: {
                    "prod_n_storeArr.quantity": {
                        $reduce: {
                            input: "$variants",
                            initialValue: 0,
                            in: {
                                "$add": [
                                    "$$value",
                                    { $sum: "$$this.prod_n_storeArr.quantity" }
                                ]
                            }
                        }
                    },
                }
            }
        ], { multi: true });

        return res.out(results.length);
    } catch (err) {
        console.error(req.originalUrl, err);
        return res.send('error')
    }
}

module.exports.cleanProductsStatuses = async function (req, res) {
    try {
        const collection = req.custom.db.collection("product");

        const results = await collection.update({
            prod_n_storeArr: { $exists: true },
        }, [
            {
                $set: {
                    "status": {
                        $cond: {
                            if: {
                                $lt: [
                                    {
                                        $reduce: {
                                            input: "$prod_n_storeArr",
                                            initialValue: 0,
                                            in: {
                                                "$add": [
                                                    "$$value",
                                                    "$$this.quantity"
                                                ]
                                            }
                                        }
                                    },
                                    1
                                ]
                            }, then: false, else: true
                        }
                    }
                }
            }
        ], { multi: true });

        return res.out(results.length);
    } catch (err) {
        console.error(req.originalUrl, err);
        return res.send('error')
    }
}

module.exports.convertStrToInt = async function (req, res) {
    try {
        const collection = req.custom.db.collection("product");
        await collection.find({ "prod_n_storeArr.quantity": { $type: "string" } }).forEach(function (doc) {
            doc.prod_n_storeArr = doc.prod_n_storeArr.map(s => ({ ...s, quantity: s.quantity = isNaN(parseInt(s.quantity)) ? 0 : parseInt(s.quantity) }));
            collection.updateOne({ _id: new ObjectId(doc._id) }, { $set: { "prod_n_storeArr": doc.prod_n_storeArr } });
        });

        await collection.find({ "variants.prod_n_storeArr.quantity": { $type: "string" } }).forEach(function (doc) {
            doc.variants = doc.variants.map(v => ({ ...v, prod_n_storeArr: v.prod_n_storeArr.map(s => ({ ...s, quantity: s.quantity = isNaN(parseInt(s.quantity)) ? 0 : parseInt(s.quantity) })) }));
            collection.updateOne({ _id: new ObjectId(doc._id) }, { $set: { "variants": doc.variants } });
        });

        res.out("Success");

    } catch (err) {
        console.error(req.originalUrl, err);
        res.Send("Error");
    }
}

module.exports.convertWalletStrToFloat = async function (req, res) {
    try {
        const collection = req.custom.db.collection("member");
        await collection.find({ "wallet": { $type: "string" } }).forEach(function (doc) {
            doc.wallet = isNaN(parseFloat(doc.wallet)) ? 0 : parseFloat(doc.wallet);
            collection.updateOne({ _id: new ObjectId(doc._id) }, { $set: { "wallet": doc.wallet } });
        });

        res.out("Success");

    } catch (err) {
        console.error(req.originalUrl, err);
        res.Send("Error");
    }
}

module.exports.pointsToTransaction = async (req, res) => {
    /**
     * This code should be run on the Mongodb server
     */
    //.aggregate([ { $project: { member_id:'$_id', points: '$points', createdAt: { $literal:new Date() }, expiresAt: { $literal: new Date(new Date().setMonth(new Date().getMonth() + 9)) }, used: { $literal:false }, trashed: { $literal:false } } }, {$out:'point_transactions'} ])

    //cron.schedule('59 23 * * *', async () => {
        try {
            const point_transactions_collection = req.custom.db.collection('point_transactions');
            const expiredTransactions = await point_transactions_collection.find({ trashed: false, expiresAt: { $lt: common.getDate() } }).toArray() || [];

            const transactionsGroupedByMember = [];
            for (let transaction of expiredTransactions) {
                const foundTransactionIndex = transactionsGroupedByMember.findIndex(t => t.member_id.toString() == transaction.member_id.toString());
                if (foundTransactionIndex > -1) {
                    transactionsGroupedByMember[foundTransactionIndex].transactions.push(transaction);
                } else {
                    transactionsGroupedByMember.push({ member_id: transaction.member_id, transactions: [transaction] });
                }
            }

            const allTransactionsIds = transactionsGroupedByMember.map(t => ObjectID(t.member_id.toString()));

            const member_collection = req.custom.db.collection('member');
            const members = await member_collection.find({ _id: { $in: allTransactionsIds } }).toArray();

            const promises = [];
            for (let m of members) {
                const foundTransactionIndex = transactionsGroupedByMember.findIndex(t => m._id.toString() == t.member_id.toString());
                let pointsToRmove = 0;
                let convertedPoints = parseInt(m.convertedPoints) || 0;
                if (foundTransactionIndex > -1) {
                    for (let t of transactionsGroupedByMember[foundTransactionIndex].transactions) {
                        const transactionPoints = parseInt(t.points);
                        if (convertedPoints >= transactionPoints) {
                            promises.push(point_transactions_collection.updateOne({ _id: ObjectID(t._id.toString()) }, { $set: { used: true, trashed: true } }));
                            convertedPoints -= transactionPoints;
                        } else if (convertedPoints < transactionPoints) {
                            promises.push(point_transactions_collection.updateOne({ _id: ObjectID(t._id.toString()) }, { $set: { trashed: true } }));
                            const sub = transactionPoints - convertedPoints;
                            convertedPoints = 0;
                            pointsToRmove += sub;
                        } else {
                            pointsToRmove += transactionPoints;
                        }
                    }
                }

                let memberPoints = m.points ? parseInt(m.points) : 0;

                if (pointsToRmove > 0 && memberPoints > 0) {
                    memberPoints -= pointsToRmove;
                    promises.push(member_collection.updateOne({ _id: ObjectID(m._id.toString()) }, { $set: { points: memberPoints, convertedPoints } }));
                }

            }

            await Promise.all(promises);

            return res.out('Done! ', expiredTransactions.length);

        } catch (err) {
            console.error(req.originalUrl, err);
        }
    //});

}


module.exports.normalize = async (req, res) => {
    const collection = req.custom.db.collection('product');

    try {
        const resposne = await collection.updateMany({}, { $set: { free_shipping: false, is_gift: false, fast_shipping: false } });
        return res.out('DONE: ' + resposne.modifiedCount);
    } catch (err) {
        console.error(req.originalUrl, err);
        return res.out(err);
    }
}


module.exports.indexProducts = async (req, res) => {
    const collection = req.custom.db.collection('product');
    try {
        const PAGE_SIZE = 500;
        const currentPage = parseInt(req.query.page) || 1
        const skip = (currentPage - 1) * PAGE_SIZE;

        const products = await collection.find({ status: true }).sort({ created: -1 }).skip(skip).limit(PAGE_SIZE).toArray();

        for (const product of products) {
            const body = {
                name: {
                    en: product.name.en,
                    ar: product.name.ar,
                },
                sku: product.sku,
                picture: product.picture
            };

            if (product.supplier_id) body.supplier_id = product.supplier_id;
            await esClient.index({
                index: 'products',
                id: product._id.toString(),
                body: body,
            });
        }
        return res.out({ message: 'Indexing completed', count: products.length, skip: skip });
    } catch (error) {
        console.error(req.originalUrl, error);
        return res.out(error);
    }
}


module.exports.deleteIndexes = async (req, res) => {
    try {
        await esClient.indices.delete({ index: 'products' });
        return res.out({ message: 'Index deleted successfully.' });
    } catch (error) {
        console.error(req.originalUrl, error);
        return res.out(error);
    }
}


module.exports.getAllIndexedProducts = async function (req, res) {
    try {
        const body = await esClient.search({
            index: 'products',
            body: {
                query: {
                    match_all: {},
                },
            },
        });

        return res.out(body.hits.hits.map(hit => hit._source));
    } catch (error) {
        console.error(req.originalUrl, error);
        return res.out(error);
    }
}


module.exports.convertOrderNumbersToString = async (req, res) => {
    try {
        const collection = req.custom.db.collection('order');

        const filter = {
            order_number: { $exists: true }
        };

        const update = [
            {
                $set: {
                    order_number: { $toString: "$order_number" }
                }
            }
        ];

        const result = await collection.updateMany(filter, update);
        //const result = await collection.updateMany(filter, { $set: { order_number: Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000 } });

        return res.out(`${result.modifiedCount} documents updated.`);

    } catch (err) {
        console.error(req.originalUrl, err);
        return res.out(err);
    }
}