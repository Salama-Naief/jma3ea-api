const { ObjectId } = require("mongodb");
const mainController = require("../../libraries/mainController");

module.exports.cleanProductsQuantities = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");

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
        console.log('Error: ', err);
        return res.send('error')
    }
}


module.exports.cleanProductsStatuses = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");

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
        console.log('Error: ', err);
        return res.send('error')
    }
}


module.exports.convertStrToInt = async function (req, res) {
    try {
        const collection = req.custom.db.client().collection("product");
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
        console.log(err);
        res.Send("Error");
    }
}


/* module.exports.test = async function(req, res) {
    try {
        mainController.list(req, res, "product", {
            "name"
        });
    } catch(err) {
        console.log(err);
        res.out(err);
    }
} */