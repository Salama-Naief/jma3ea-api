// Checkout/Buy model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const payment_methods = require("../../../enums/payment_methods");

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
	"discount_by_wallet": new Field({
		"type": Boolean,
		"required": false,
	}),
	"delivery_time": new Field({
		"required": true,
	}),
	"hash": new Field({
		"unique": true,
		"collection": 'order'
	}),
	"address_id": new Field({
		"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
	}),
};