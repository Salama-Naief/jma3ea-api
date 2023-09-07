const moment = require('moment');
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

module.exports.getDeliveryTimes = async (req, cityObj, supplier = {}) => {
    let delivery_times = [];
    let min_delivery_time_setting = 30;
    if (parseInt(req.custom.settings.orders.min_delivery_time) > 0) {
        min_delivery_time_setting = parseInt(req.custom.settings.orders.min_delivery_time);
    }

    if (supplier.is_external && supplier.min_delivery_time && parseInt(supplier.min_delivery_time) > 0) {
        min_delivery_time_setting = parseInt(supplier.min_delivery_time);
    }

    const cache = req.custom.cache;
    let times = [];
    moment.updateLocale('en', {});
    const min_delivery_time = getRoundedDate(60, new Date(moment().add(min_delivery_time_setting, 'minutes').format(req.custom.config.date.format).toString()));
    const min_hour = parseInt(moment(min_delivery_time).format('H'));
    let today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    let available_delivery_times = [...req.custom.settings.orders.available_delivery_times[today.format('d')]];

    if (cityObj && cityObj.enable_custom_delivery_times) {
        available_delivery_times = this.mergeDeliveryTimes(available_delivery_times, cityObj.available_delivery_times[today.format('d')]);
    }

    if (supplier.is_external && supplier.available_delivery_times) {
        available_delivery_times = this.mergeDeliveryTimes(available_delivery_times, supplier.available_delivery_times[today.format('d')]);
    }

    if (available_delivery_times) {
        const day = moment().format('d');
        const min_day = moment(min_delivery_time);
        for (let idx = min_hour; idx < available_delivery_times.length; idx++) {
            today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
            if (!available_delivery_times[idx] ||
                !available_delivery_times[idx].is_available ||
                !available_delivery_times[idx].max_orders ||
                min_day.format('d') != moment().format('d') ||
                (idx < min_hour)
            ) {
                continue;
            }
            moment.updateLocale('en', {});
            const full_date = today.add(idx, 'hours').format(req.custom.config.date.format);
            const time = today.format('LT') + ' : ' + today.add(2, 'hours').format('LT');

            const cache_key_dt = `delivery_times_${supplier.is_external ? supplier._id.toString() : ''}_${day}_${idx}`;
            const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);

            if (available_delivery_times[idx].max_orders > cached_delivery_times) {
                times.push({
                    'time': time,
                    'full_date': full_date,
                    'is_available': true,
                    'text': req.custom.local.delivery_time_available,
                });
            }

        }
    }
    moment.updateLocale(req.custom.lang, {});
    today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    delivery_times.push({
        'day': today.format('dddd'),
        'times': times
    });

    times = [];
    moment.updateLocale('en', {});
    let tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    let tomorrow_available_delivery_times = [...req.custom.settings.orders.available_delivery_times[tomorrow.format('d')]];
    if (cityObj && cityObj.enable_custom_delivery_times) {
        tomorrow_available_delivery_times = this.mergeDeliveryTimes(tomorrow_available_delivery_times, cityObj.available_delivery_times[tomorrow.format('d')])
    }
    //
    if (supplier.is_external && supplier.available_delivery_times) {
        tomorrow_available_delivery_times = this.mergeDeliveryTimes(tomorrow_available_delivery_times, supplier.available_delivery_times[tomorrow.format('d')]);

    }
    if (tomorrow_available_delivery_times) {
        const day = tomorrow.format('d');

        for (let idx = 0; idx < tomorrow_available_delivery_times.length; idx++) {
            tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
            if (!tomorrow_available_delivery_times[idx] ||
                !tomorrow_available_delivery_times[idx].is_available ||
                !tomorrow_available_delivery_times[idx].max_orders
            ) {
                continue;
            }
            moment.updateLocale('en', {});
            const full_date = tomorrow.add(idx, 'hours').format(req.custom.config.date.format);
            const time = tomorrow.format('LT') + ' : ' + tomorrow.add(2, 'hours').format('LT');

            const cache_key_dt = `delivery_times_${supplier.is_external ? supplier._id.toString() : ''}_${day}_${idx}`;
            const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);
            if (tomorrow_available_delivery_times && tomorrow_available_delivery_times[idx] && tomorrow_available_delivery_times[idx].max_orders > cached_delivery_times) {
                times.push({
                    'time': time,
                    'full_date': full_date,
                    'is_available': true,
                    'text': req.custom.local.delivery_time_available,
                });
            }

        }
    }

    moment.updateLocale(req.custom.lang, {});
    tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    delivery_times.push({
        'day': tomorrow.format('dddd'),
        'times': times
    });

    return delivery_times;
}

module.exports.getAvailableOffer = async (req, total, userOffer) => {
    const collection = req.custom.db.client().collection('offer');
    const query = {
        status: true,
        min_amount: { $lte: total },
    };

    if (!userOffer || !userOffer.viewed_offer_id /* || !userOffer.offer_id || (userOffer.offer_id.toString() !== userOffer.viewed_offer_id.toString()) */) {
        query["target_amount"] = { $gte: total }
    }

    if (userOffer && userOffer.offer_id) {
        query['_id'] = ObjectID(userOffer.offer_id.toString());
    } else if (userOffer && userOffer.viewed_offer_id) {
        query['_id'] = ObjectID(userOffer.viewed_offer_id.toString());
    }

    const options = {
        sort: { target_amount: 1 },
        projection: { _id: 1, min_amount: 1, target_amount: 1, name: 1, description: 1, expires_at: 1, product_sku: 1, type: 1 }
    };

    const offer = await collection.findOne(query, options);

    if (!offer) {
        console.log('====== OFFER DOES NOT EXIST: ======');
        return null
    };
    if (offer.min_amount > total && (!userOffer || userOffer.viewed_offer_id != offer._id.toString())) {
        console.log('========= OFFER DISAPPEARED... =============: ', offer);
        return null
    };

    if (userOffer && userOffer.offer_id && offer.target_amount >= total) {
        console.log('========= IT IS ALREADY CLAIMED ========');
        offer.isClaimed = true;
    } else {
        await viewOffer(req, offer._id.toString());
        offer.isClaimed = false;
    }


    return offer;
}

const viewOffer = async (req, offer_id) => {
    let user = req.custom.authorizationObject;

    if (!user.offer) user.offer = {
		offer_id: null,
        viewed_offer_id: null
	}

    const collection = req.custom.db.client().collection('offer');

    try {
		const offer = await collection.findOne({ _id: ObjectID(offer_id), status: true });
		if (!offer) return;

		user.offer.viewed_offer_id = offer_id;

        await req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token);

	} catch (err) { }
}

function getRoundedDate(minutes, d = null) {
    if (!d) {
        d = common.getDate();
    }

    const rended_minutes = d.getMinutes() + 30;
    d.setMinutes(rended_minutes);

    let ms = 1000 * 60 * minutes; // convert minutes to ms
    return new Date(Math.round(d.getTime() / ms) * ms);
}

module.exports.convertDeliveryTimeToArabic = (delivery_times) => {
    const convertedDeliveryTimes = delivery_times.map(dt => {
        return {
            day: dt.day, times: dt.times.map(t => {
                //"10:00 PM : 12:00 AM"
                const timeParts = t.time.split(' : ');

                if (timeParts.length !== 2) {
                    console.log('=============================================================== ****************** TIME PARTS ********************** =========================================================: ', timeParts);
                    return "Invalid input format";
                }

                //10:00 PM
                const startTime = timeParts[0];
                const endTime = timeParts[1];

                const startTimeComponents = startTime.split(' ');
                const endTimeComponents = endTime.split(' ');

                if (startTimeComponents.length !== 2 || endTimeComponents.length !== 2) {
                    return "Invalid input format";
                }

                const startHAndM = startTimeComponents[0].split(':');
                const endHAndM = endTimeComponents[0].split(':');

                // 10:00
                const startHour = startHAndM[0];
                const endHour = endHAndM[0];

                const startMinutes = startHAndM[1];
                const endMinutes = endHAndM[1];

                const startPeriod = startTimeComponents[1].toUpperCase();
                const endPeriod = endTimeComponents[1].toUpperCase();

                const arabicStartHour = getArabicNumber(startHour);
                const arabicEndHour = getArabicNumber(endHour);

                const arabicStartMinutes = getArabicNumber(startMinutes);

                const arabicEndMinutes = getArabicNumber(endMinutes);

                const arabicStartPeriod = startPeriod === 'AM' ? 'ص' : 'م';
                const arabicEndPeriod = endPeriod === 'AM' ? 'ص' : 'م';

                const arabicTime = `${arabicStartHour}:${arabicStartMinutes} ${arabicStartPeriod} : ${arabicEndHour}:${arabicEndMinutes} ${arabicEndPeriod}`;

                return { ...t, time: arabicTime };
            })
        }
    });

    return convertedDeliveryTimes;
}

function getArabicNumber(inputNumber) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    const arabicNumber = Array.from(inputNumber.toString(), digit => arabicNumerals[parseInt(digit)]).join('');

    return arabicNumber;
}