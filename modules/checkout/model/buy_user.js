// Checkout/Buy model
const ObjectID = require("mongodb").ObjectID;
const enums = require("../../../libraries/enums");

module.exports = {
	"payment_method": {
		"required": true,
		"in_array": enums.payment_methods().map((i) => i.id)
	},
	"payment_details": {
		"type": Object,
	},
	"notes": {
		"type": String,
	},
	"delivery_time": {
		"required": true,
	},
	"hash": {
		"unique": true,
		"collection": 'order'
	},
	"address_name": {
		"required": true,
	},
};