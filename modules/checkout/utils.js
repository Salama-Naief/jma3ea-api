const ObjectID = require("../../types/object_id");

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

module.exports.groupBySupplier = (products, suppliers = []) => {
    const newProducts = [];
    for (let p of products) {
        const foundSupplierIndex = newProducts.findIndex(np => np.supplier._id.toString() == p.supplier_id.toString());
        if (foundSupplierIndex > -1) {
            newProducts[foundSupplierIndex].products.push(p);
        } else {
            newProducts.push({ supplier: p.supplier, products: [p], isSelected: suppliers.length > 0 ? suppliers.includes(p.supplier._id.toString()) : true });
        }
    }

    return newProducts;
}


module.exports.getAvailableOffer = async (req, total, offer_id) => {
    const collection = req.custom.db.client().collection('offer');
    const query = {
        status: true,
        min_amount: { $lte: total },
        target_amount: { $gte: total }
    };

    if (offer_id) {
        query['_id'] = ObjectID(offer_id.toString());
    }

    const options = {
        sort: { target_amount: 1 }
    };

    const offer = await collection.findOne(query, options);

    if (offer) {
        if (offer_id)
            offer.isClaimed = true;
        else
            offer.isClaimed = false;
    }

    return offer;
}