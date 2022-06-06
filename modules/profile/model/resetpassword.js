// Forgot password model
const Field = require("../../../libraries/field");

module.exports = {
    "otp_code": new Field({
        "required": true,
	}),
    "new_password": new Field({
        "required": true
    }),
    "password_confirmation": new Field({
        "required": true,
        "equal_to": "new_password"
    })
};