// Forgot password model
const Field = require("../../../libraries/field");

module.exports = {
    "email": new Field({
        "type": "email",
        "required": false,
        "exists": true,
        "collection": 'member'
    }),
    "mobile": new Field({
        "required": false,
        "exists": true,
        "collection": 'member'
    })
};