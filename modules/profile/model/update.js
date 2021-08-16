// Update Profile model
const common = require('../../../libraries/common');
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");

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