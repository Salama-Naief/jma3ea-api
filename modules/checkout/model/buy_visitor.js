// Checkout/Buy model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const config = require("../../../config");
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
		"required": config.order.delivery_time_is_required,
	}),
	"suppliers": new Field({
		"type": Array,
		"required": false,
	}),
	"hash": new Field({
		"unique": true,
		"collection": 'order'
	}),
	"user_data": new Field({
		"type": Object,
		"required": true,
		"model": {
			"fullname": new Field({
				"required": config.data_to_save.indexOf("fullname") > -1 ? false : true,
			}),
			"email": new Field({
				"type": "email",
				"required": false,
			}),
			"mobile": new Field({
				"required": true,
				"length": 8,
			}),
			// "secondary_mobile": new Field({
			// 	"required": false,
			// 	"length": 8,
			// }),
			"address": new Field({
				"type": Object,
				"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
				"model": {
					"city_id": new Field({
						"type": ObjectID,
						"collection": "city",
						"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
					}),
					"widget": new Field({
						"default": "",
						"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
					}),
					"street": new Field({
						"default": "",
						"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
					}),
					"gada": new Field({
						"default": "",
						"required": false
					}),
					"house": new Field({
						"default": "",
						"required": config.data_to_save.indexOf("address_id") > -1 ? false : true,
					}),
					"floor": new Field({
						"default": "",
						"required": false
					}),
					"apartment_number": new Field({
						"default": "",
						"required": false
					}),
					"latitude": new Field({
						"default": 0
					}),
					"longitude": new Field({
						"default": 0
					})
				}
			})
		}
	})
};