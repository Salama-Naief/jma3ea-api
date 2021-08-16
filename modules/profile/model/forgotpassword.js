// Forgot password model
const Field = require("../../../libraries/field");

module.exports = {
    "email": new Field({
        "type": "email",
        "required": true,
        "exists": true,
        "collection": 'member'
    }),
};