const common = require('../../libraries/common');
const Field = require("../../../libraries/field");

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
        "default": common.getDate(),
        "insertOnly": true,
        "auto": true
    })
};