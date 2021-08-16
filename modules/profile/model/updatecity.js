// City model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
module.exports = {
    "city_id": new Field({
        "required": true,
        "type": ObjectID,
    }),
};