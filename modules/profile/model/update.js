// Update Profile model
const Field = require("@big_store_core/base/libraries/field");
const common = require('@big_store_core/base/libraries/common');

module.exports = {
    "fullname": new Field({
        "required": true
    }),
    "username": new Field({
        "required": true,
        "unique": true,
        "collection": 'member'
    }),
    "email": new Field({
        "required": true,
        "unique": true,
        "collection": 'member'
    }),
    "mobile": new Field({
        "required": true,
        "length": 8,
        "unique": true,
        "collection": 'member'
    }),
    "address": new Field({
        "type": Object,
        "model": {
            "city_id": new Field({
                "type": ObjectID,
                "collection": "city",
                "required": true
            }),
            "widget": new Field({
                "default": "",
                "required": true
            }),
            "street": new Field({
                "default": "",
                "required": true
            }),
            "gada": new Field({
                "default": "",
                "required": true
            }),
            "house": new Field({
                "default": "",
                "required": true
            }),
            "latitude": new Field({}),
            "longitude": new Field({})
        }
    }),
    "modified": new Field({
        "type": Date,
        "default": common.getDate(),
        "updateOnly": true,
        "auto": true
    })
};