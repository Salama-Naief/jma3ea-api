// Brand model
const common = require('../../../libraries/common');
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const config = require("../../../config");

module.exports = {
	"fullname": new Field({
		"required": true
	}),
	"username": new Field({
		"required": config.data_to_save.indexOf("username") > -1 ? false : true,
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
		"required": config.data_to_save.indexOf("address") > -1 ? false : true,
		"model": {
			"city_id": new Field({
				"type": ObjectID,
				"collection": "city",
				"required": config.data_to_save.indexOf("city_id") > -1 ? false : true,
			}),
			"widget": new Field({
				"default": "",
				"required": config.data_to_save.indexOf("widget") > -1 ? false : true,
			}),
			"street": new Field({
				"default": "",
				"required": config.data_to_save.indexOf("street") > -1 ? false : true,
			}),
			"gada": new Field({
				"default": "",
				"required": false
			}),
			"house": new Field({
				"default": "",
				"required": config.data_to_save.indexOf("house") > -1 ? false : true,
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