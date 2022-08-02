// Profile/Wallet/Add model
const Field = require("../../../libraries/field");

module.exports = {
	"payment_method": new Field({
		"required": true,
		"in_array": ["knet", "tap"]
	}),
	"payment_details": new Field({
		"type": Object,
	}),
	"amount": new Field({
		"type": Number,
		"required": true
	}),
	"hash": new Field({
		"type": String
	}),
};