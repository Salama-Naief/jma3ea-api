// Brand model
const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "fullname": {
        "required": true
    },
    "username": {
        "required": true,
        "unique": true,
        "collection": 'member'
    },
    "email": {
        "required": true,
        "unique": true,
        "collection": 'member'
    },
    "mobile": {
        "required": true,
		"length": 8,
        "unique": true,
        "collection": 'member'
    },
    "address": {
        "type": Object,
        "model": {
            "widget": {
            },
            "street": {
            },
            "gada": {
            },
            "house": {
            },
            "latitude": {
            },
            "longitude": {
            }
        }
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    }
};