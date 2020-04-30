// Checkout/Buy model
const ObjectID = require("@big_store_core/base/types/object_id");
const Field = require("@big_store_core/base/libraries/field");
const payment_methods = require("@big_store_core/base/enums/payment_methods");

module.exports = {
	"payment_method": new Field({
		"required": true,
		"in_array": payment_methods().map((i) => i.id)
	}),
	"payment_details": new Field({
		"type": Object,
	}),
	"notes": new Field({
		"type": String,
	}),
	"delivery_time": new Field({
		"required": true,
	}),
	"hash": new Field({
		"unique": true,
		"collection": 'order'
	}),
	"address_id": new Field({
		"required": true,
	}),
};