// supplier Controller

// Load required modules
const status_message = require("../../enums/status_message");
const mainController = require("../../libraries/mainController");
const collectionName = 'supplier';

module.exports.read = async function (req, res) {
    const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

    if (!cityid) {
        return res.out({
            'message': req.custom.local.choose_city_first
        }, status_message.CITY_REQUIRED);
    }

    mainController.read(req, res, collectionName, {
        "_id": 1,
        "name": {
            $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
        },
        "description": {
            $ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
        },
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
    });
}