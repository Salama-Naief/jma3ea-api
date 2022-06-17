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
