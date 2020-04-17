// Update Profile model
const Field = require("@big_store_core/base/libraries/field");

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
            "widget": new Field({
            }),
            "street": new Field({
            }),
            "gada": new Field({
            }),
            "house": new Field({
            }),
            "latitude": new Field({
            }),
            "longitude": new Field({
            }),
        }
    }),
    "modified": new Field({
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    })
};