// Brand model
const ObjectID = require("@big_store_core/base/types/object_id");
const Field = require("@big_store_core/base/libraries/field");
const common = require('@big_store_core/base/libraries/common');

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
		"model": new Field({
			"city_id": new Field({
				"type": ObjectID,
				"collection": "city",
				"required": true
			}),
			"widget": new Field({
				"default": ""
			}),
			"street": new Field({
				"default": ""
			}),
			"gada": new Field({
				"default": ""
			}),
			"house": new Field({
				"default": ""
			}),
			"latitude": new Field({}),
			"longitude": new Field({})
		})
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