
const Field = require("@big_store_core/base/libraries/field");

// Add device model
module.exports = {
    "token": new Field({
        "required": true,
        "unique": true,
        "collection": 'device'
    }),
    "type": new Field({
        "required": true,
        "type": Number
    }),
    "created": new Field({
        "type": Date,
        "default": new Date(),
        "insertOnly": true,
        "auto": true
    })
};