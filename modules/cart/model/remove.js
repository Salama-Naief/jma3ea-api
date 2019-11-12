// Add cart model
const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "product_id": {
        "required": true,
        "type": ObjectID
    }
};