// inventory Controller

// Load required modules
const { filter_internal_suppliers_by_city } = require("../../libraries/common");
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");
const collectionName = 'inventory';

module.exports.list = async function (req, res) {
    const cache = req.custom.cache;
    const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

    //const cache_key = `${collectionName}_${req.custom.lang}_city_${cityid}`;

    /* if (cache_key) {
        const cached_data = await cache.get(cache_key).catch(() => null);
        if (cached_data) {
            return res.out({ count: cached_data.length, inventories: cached_data });
        }
    } */

    mainController.list_all(req, res, collectionName, {
        "_id": 1,
        "name": {
            $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
        },
        "picture": 1
    }, async (out) => {
        if (out.data && out.data.length < 1) {
            return res.out(out);
        }

        const inventories = [];
        const supplier_collection = "supplier";
        const collection = req.custom.db.client().collection(supplier_collection);
        const pipeline = [
            {
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
            },
            // Stage 4
            {
                $sort: {
                    "created": -1
                },
            },
            // Stage 2
            {
                $limit: 1000
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
                    "picture": 1,
                    "working_times": 1,
                    "delivery_time": 1,
                    "delivery_time_text": 1,
                    "min_order": 1
                }
            }
        ];

        const options = {
            "allowDiskUse": true
        };

        //req.custom.clean_filter = await filter_internal_suppliers_by_city(req, true);
        console.log('city: ', cityid);
        for (let inventory of out.data) {
            req.custom.clean_filter = { inventory_id: ObjectID(inventory._id.toString()), cities: ObjectID(cityid), is_external: true, status: true };
            inventory.min_value = inventory.min_order;
            inventory.min_delivery_time = inventory.delivery_time;
            inventory.suppliers = await new Promise((resolve, reject) => {
                collection.aggregate([{ $match: req.custom.clean_filter }, ...pipeline], options).toArray((err, results) => {
                    if (err) {
                        reject(err);
                    }

                    //results.unshift({ _id: req.custom.settings.site_name['en'], name: req.custom.settings.site_name[req.custom.lang || req.custom.config.local], picture: "https://jm3eia.com/assets/img/logo.png" });

                    resolve(results);
                });
            }).catch(() => null);
            if (inventory.suppliers.length > 0) {
                console.log('yes');
                inventories.push(inventory);
            } else {
                console.log('no: ', inventory.suppliers);
            }
        }

        out.data = inventories;
        out.count = inventories.length;

        /* if (cache_key && inventories.length > 0) {
            cache.set(cache_key, inventories, req.custom.config.cache.life_time).catch(() => null);
        } */

        return res.out(out);

    });
}