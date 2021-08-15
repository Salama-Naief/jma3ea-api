// Checkout/Buy model
const ObjectID = require("../../types/object_id");
const Field = require("../../libraries/field");
const config = require("../../config");
const payment_methods = require("../../enums/payment_methods");

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
		"required": config.order.delivery_time_is_required,
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
				"required": true
			}),
			"email": new Field({
				"type": "email",
				"required": false,
			}),
			"mobile": new Field({
				"required": true,
				"length": 8,
			}),
			"address": new Field({
				"type": Object,
				"required": true,
				"model": {
					"city_id": new Field({
						"type": ObjectID,
						"collection": "city",
						"required": true
					}),
					"widget": new Field({
						"default": "",
						"required": true
					}),
					"street": new Field({
						"default": "",
						"required": true
					}),
					"gada": new Field({
						"default": "",
						"required": false
					}),
					"house": new Field({
						"default": "",
						"required": true
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