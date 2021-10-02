// Brand model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const common = require('../../../libraries/common');

module.exports = {
	"name": new Field({
		"required": true,
	}),
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
		"required": true
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