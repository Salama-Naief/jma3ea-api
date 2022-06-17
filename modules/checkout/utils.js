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
        await collection.update(await collection.update({
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
                    "prod_n_storeArr.status": {
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
        ], { multi: true }));
    } catch (err) {
        console.log(err);
    }
}