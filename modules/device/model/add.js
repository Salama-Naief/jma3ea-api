// Add device model
module.exports = {
    "token": {
        "required": true,
        "unique": true,
        "collection": 'device'
    },
    "type": {
        "required": true,
        "type": Number
    },
    "created": {
        "type": Date,
        "default": new Date(),
        "insertOnly": true,
        "auto": true
    }
};