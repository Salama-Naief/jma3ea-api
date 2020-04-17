// Forgot password model
const Field = require("@big_store_core/base/libraries/field");

module.exports = {
    "email": new Field({
        "type": "email",
        "required": true,
        "exists": true,
        "collection": 'member'
    }),
};