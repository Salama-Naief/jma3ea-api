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
            variants: { $exists: true },
            $expr: {
                $lt: [
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
                    1
                ]
            },
        }, [
            {
                $set: { "prod_n_storeArr.status": false }
            }
        ], { multi: true });

        return res.out(results.length);
    } catch (err) {
        console.log('Error: ', err);
        return res.send('error')
    }
}
