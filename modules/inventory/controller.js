// inventory Controller

// Load required modules
const status_message = require("../../enums/status_message");
const { isSupplierOpen } = require("../../libraries/common");
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");
const collectionName = 'inventory';

module.exports.list = async function (req, res) {
    const cache = req.custom.cache;
    const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

    const cache_key = `${collectionName}_${req.custom.lang}_city_${cityid}`;

    if (false) {
        const cached_data = await cache.get(cache_key).catch(() => null);
        if (cached_data) {
            return res.out({ count: cached_data.length, data: cached_data });
        }
    }

    if (!cityid) {
        return res.out({
            'message': req.custom.local.choose_city_first
        }, status_message.CITY_REQUIRED);
    }

    mainController.list_all(req, res, collectionName, {
        "_id": 1,
        "name": {
            $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
        },
        "picture": {
            $ifNull: [`$picture.${req.custom.lang}`, `$picture`]
        },
        "logo": {
            $ifNull: [`$logo.${req.custom.lang}`, `$logo.${req.custom.config.local}`]
        },
        //"picture": 1,
    }, async (out) => {
        if (out.data && out.data.length < 1) {
            return res.out(out);
        }

        const inventories = [];
        const supplier_collection = "supplier";
        const collection = req.custom.db.client().collection(supplier_collection);
        const pipeline = [
            /* {
                $lookup: {
                    from: 'product',
                    localField: '_id',
                    foreignField: 'supplier_id',
                    as: 'products'
                }
            },
            {
                $match: {
                    products: {
                        $ne: []
                    }
                }
            }, */
            // Stage 4
            {
                $sort: {
                    "sorting": 1
                },
            },
            // Stage 2
            {
                $limit: 100
            },
            // Stage 3
            {
                $project: {
                    "_id": 1,
                    "name": {
                        $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
                    },
                    "description": {
                        $ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
                    },
                    /* "picture": {
                        $ifNull: [`$picture.${req.custom.lang}`, `$picture`]
                    }, */
                    "picture": 1,
                    "logo": 1,
                    "working_times": 1,
                    "delivery_time": 1,
                    "delivery_time_text": 1,
                    "min_order": 1,
                    "shipping_cost": 1,
                    "app_delivery_time": 1,
                    "avg_rating": 1,
                    "reviews_count": 1
                }
            }
        ];

        const options = {
            "allowDiskUse": true
        };


        //req.custom.clean_filter = await filter_internal_suppliers_by_city(req, true);
        for (let inventory of out.data) {
            req.custom.clean_filter = { inventory_id: ObjectID(inventory._id.toString()), cities: ObjectID(cityid), is_external: true, status: true };
            inventory.min_value = inventory.min_order;
            inventory.min_delivery_time = inventory.delivery_time;
            if (inventory.picture && inventory.picture != undefined) {
                inventory.picture = inventory.picture.includes(req.custom.config.media_url) ? inventory.picture : (req.custom.config.media_url + inventory.picture);
            }
            if (inventory.logo && inventory.logo != undefined) {
                inventory.logo = inventory.logo.includes(req.custom.config.media_url) ? inventory.logo : (req.custom.config.media_url + inventory.logo);
            }
            inventory.suppliers = await new Promise((resolve, reject) => {
                collection.aggregate([{ $match: req.custom.clean_filter }, ...pipeline], options).toArray((err, results) => {
                    if (err) {
                        console.log('SUPPLIERS ERROR: ', err);
                        reject(err);
                    }

                    //results.unshift({ _id: req.custom.settings.site_name['en'], name: req.custom.settings.site_name[req.custom.lang || req.custom.config.local], picture: "https://jm3eia.com/assets/img/logo.png" });
                    console.log('SUPPLIERS RESULTS: ', results);
                    resolve(results);
                });
            }).catch(() => null);
            if (inventory && inventory.suppliers && inventory.suppliers.length > 0) {
                inventory.suppliers = inventory.suppliers.map(i => {
                    if (i.picture && i.picture != undefined) {
                        if (typeof i.picture === 'object') {
                            i.picture = i.picture.en;
                        }
                        i.picture = i.picture.includes(req.custom.config.media_url) ? i.picture : (req.custom.config.media_url + i.picture);
                    }
                    if (i.logo && i.logo != undefined) {
                        i.logo = i.logo.includes(req.custom.config.media_url) ? i.logo : (req.custom.config.media_url + i.logo);
                    }
                    i.isOpen = isSupplierOpen(i);
                    return i;
                });
                inventories.push(inventory);
            }
        }

        out.data = inventories;
        out.count = inventories.length;

        if (cache_key && inventories.length > 0) {
            await cache.set(cache_key, inventories, req.custom.config.cache.life_time).catch(() => null);
        }

        return res.out(out);

    });
}