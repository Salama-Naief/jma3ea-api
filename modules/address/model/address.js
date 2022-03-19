// Brand model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const common = require('../../../libraries/common');
const config = require("../../../config");

module.exports = {
	"name": new Field({
		"required": true,
	}),
	"fullname": new Field({
		"required": true
	}),
	"mobile": new Field({
		"required": true,
		"length": 8,
	}),
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
	"latitude": new Field({
		"required": false
	}),
	"longitude": new Field({
		"required": false
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
	})
};