// Brand model
const common = require('../../../libraries/common');
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");

module.exports = {
	"fullname": new Field({
		"required": true
	}),
	"username": new Field({
		"required": true,
		"unique": true,
		"collection": 'member'
	}),
	"password": new Field({
		"required": true
	}),
	"email": new Field({
		"type": "email",
		"required": true,
		"unique": true,
		"collection": 'member'
	}),
	"mobile": new Field({
		"required": true,
		"length": 8,
		"unique": true,
		"collection": 'member'
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
			"floor": new Field({
				"default": "",
				"required": false
			}),
			"apartment_number": new Field({
				"default": "",
				"required": false
			}),
			"latitude": new Field({}),
			"longitude": new Field({})
		}
	}),
	"created": new Field({
		"type": Date,
		"default": common.getDate(),
		"insertOnly": true,
		"auto": true
	}),
	"modified": new Field({
		"type": Date,
		"default": common.getDate(),
		"updateOnly": true,
		"auto": true
	}),
	"status": new Field({
		"type": Boolean,
		"default": true
	})
};