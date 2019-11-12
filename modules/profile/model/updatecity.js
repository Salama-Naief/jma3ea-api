// City model
const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "city_id": {
        "required": true,
        "type": ObjectID
    },
};