// Brand model
const ObjectID = require("@big_store_core/base/types/object_id");
const Field = require("@big_store_core/base/libraries/field");
const common = require('@big_store_core/base/libraries/common');

module.exports = {
	"name": new Field({
		"required": true,
		"insertOnly": true
	}),
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