// Add cart model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
module.exports = {
    "product_id": new Field({
        "required": true,
        "type": ObjectID
    })
};