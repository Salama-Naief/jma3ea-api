// Checkout/Buy model
const ObjectID = require("mongodb").ObjectID;
const enums = require("../../../libraries/enums");

module.exports = {
	"payment_method": {
		"required": true,
		"in_array": enums.payment_methods.map((i) => i.id)
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
	"user_data": {
		"type": Object,
		"required": true,
		"model": {
			"fullname": {
				"required": true
			},
			"email": {
				"type": "email",
				"required": true,
			},
			"mobile": {
				"required": true,
				"length": 8,
				"unique": true
			},
			"address": {
				"type": Object,
				"required": true,
				"model": {
					"city_id": {
						"type": ObjectID,
						"collection": "city",
						"required": true
					},
					"widget": {},
					"street": {},
					"gada": {},
					"house": {},
					"latitude": {},
					"longitude": {}
				}
			}
		}
	}
};