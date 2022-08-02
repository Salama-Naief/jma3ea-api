// Profile/Wallet/Send model
const Field = require("../../../libraries/field");

module.exports = {
    "mobile": new Field({
		"required": true,
		"length": 8,
		"collection": 'member'
	}),
    "amount": new Field({
        "type": Number,
        "required": true,
    }),
};