// Forgot password model
const Field = require("../../../libraries/field");

module.exports = {
    "reset_hash": new Field({
        "required": true,
        "exists": true,
        "collection": 'member'
	}),
    "new_password": new Field({
        "required": true
    }),
    "re_new_password": new Field({
        "required": true,
        "equal_to": "new_password"
    })
};