const ObjectID = require("../../types/object_id");
const Field = require("../../libraries/field");

module.exports = {
    "name": new Field({
        "type": String,
        "required_or": "member_id"
    }),
    "stars": new Field({
        "type": Number,
        "required": true
    }),
    "comment": new Field({
        "type": String,
        "required": false
    }),
    "supplier_id": new Field({
        "type": ObjectID,
        "collection": "supplier",
        "required": true
    }),
    "device_token": new Field({
        "type": Number,
        "required": false
    }),
};
