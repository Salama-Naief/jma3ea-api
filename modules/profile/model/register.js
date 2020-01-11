// Brand model
const ObjectID = require("mongodb").ObjectID;
module.exports = {
	"fullname": {
		"required": true
	},
	"username": {
		"required": true,
		"unique": true,
		"collection": 'member'
	},
	"password": {
		"required": true
	},
	"email": {
		"type": "email",
		"required": true,
		"unique": true,
		"collection": 'member'
	},
	"mobile": {
		"required": true,
		"length": 8,
		"unique": true,
		"collection": 'member'
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
			"widget": {
				"default": ""
			},
			"street": {
				"default": ""
			},
			"gada": {
				"default": ""
			},
			"house": {
				"default": ""
			},
			"latitude": {},
			"longitude": {}
		}
	},
	"created": {
		"type": Date,
		"default": new Date(),
		"insertOnly": true,
		"auto": true
	},
	"modified": {
		"type": Date,
		"default": new Date(),
		"updateOnly": true,
		"auto": true
	},
	"status": {
		"type": Boolean,
		"default": true
	}
};