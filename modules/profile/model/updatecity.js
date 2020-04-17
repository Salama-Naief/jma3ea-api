// City model
const ObjectID = require("@big_store_core/base/types/object_id");
const Field = require("@big_store_core/base/libraries/field");
module.exports = {
    "city_id": new Field({
        "required": true,
        "type": ObjectID,
    }),
};