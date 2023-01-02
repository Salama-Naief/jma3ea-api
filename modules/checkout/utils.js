/**
 * This functions is used to merge the delivery times of settings and city in a specific day
 * @param {Array} settingTimes - The delivery times in settings
 * @param {Array} cityTimes - The delivery times in city
 * @returns 
 */
module.exports.mergeDeliveryTimes = function (settingTimes, cityTimes) {
    if (!cityTimes || cityTimes.length < 1) return settingTimes;

    let deliveryTimes = settingTimes;

    for (let [index, time] of cityTimes.entries()) {
        if (time.is_enabled) {
            // Update a specific delivery time with the city's
            deliveryTimes[index] = time;
        }
    }

    return deliveryTimes;

}

module.exports.cleanProduct = async function (req, cart) {
    const collection = req.custom.db.client().collection("product");
    const skus = Object.keys(cart).map((sku => sku.includes('-') ? sku.split('-')[0] : sku));
    try {

        await collection.update({
            sku: { $in: skus },
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

        await collection.update({
            sku: { $in: skus },
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

        /* await collection.update(await collection.update({
            sku: skus,
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
                    "status": {
                        $cond:
                            [
                                {
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
                                }, false, true]
                    },
                },
            }
        ], { multi: true })); */
    } catch (err) {
        console.log(err);
    }
}


module.exports.groupBySupplier = (products) => {
    const newProducts = [];
    for (let p of products) {
        const foundSupplierIndex = newProducts.findIndex(np => np.supplier._id.toString() == p.supplier_id.toString());
        if (p.supplier._id == "Jm3eia") {
            console.log("Details: ", foundSupplierIndex, p, newProducts);
        }
        if (foundSupplierIndex > -1) {
            console.log("Existing: ", p.supplier._id);
            newProducts[foundSupplierIndex].products.push(p);
        } else {
            console.log("Adding: ", p.supplier_id);
            newProducts.push({ supplier: p.supplier, products: [p] });
        }
    }

    return newProducts;
}
