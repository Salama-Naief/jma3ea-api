const { ObjectId } = require("mongodb");

module.exports.cleanProductsQuantities = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");

        const results = await collection.update({
            variants: { $exists: true },
            $expr: {
                $gt: [
                    {
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
                    0
                ]
            },
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
        console.log('Error: ', err);
        return res.send('error')
    }
}


module.exports.cleanProductsStatuses = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");

        const results = await collection.update({
            prod_n_storeArr: { $exists: true },
            $expr: {
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
            },
        }, [
            {
                $set: { "status": false }
            }
        ], { multi: true });

        return res.out(results.length);
    } catch (err) {
        console.log('Error: ', err);
        return res.send('error')
    }
}


module.exports.convertStrToInt = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");
        await collection.find({ "prod_n_storeArr.quantity": { $type: "string" } }).forEach(function (doc) {
            doc.prod_n_storeArr = doc.prod_n_storeArr.map(s => s.quantity = parseInt(s.quantity));
            collection.updateOne({ _id: new ObjectId(doc._id) }, { $set: { "prod_n_storeArr": doc.prod_n_storeArr } });
        });

        await collection.find({ "variants.prod_n_storeArr.quantity": { $type: "string" } }).forEach(function (doc) {
            doc.variants = doc.variants.map(v => ({ ...v, prod_n_storeArr: v.prod_n_storeArr.map(s => s.quantity = parseInt(s.quantity)) }));
            collection.updateOne({ _id: new ObjectId(doc._id) }, { $set: { "variants": doc.variants } });
        });

        res.out("success");

    } catch (err) {
        console.log(err);
        res.Send("Error");
    }
}