// Brand model
const ObjectID = require("mongodb").ObjectID;
module.exports = {
	"name": {
		"required": true,
        "insertOnly": true
	},
	"city_id": {
		"type": ObjectID,
		"collection": "city",
		"required": true
	},
	"widget": {
		"required": true
	},
	"street": {
		"required": true
	},
	"gada": {
		"required": true
	},
	"house": {
		"required": true
	},
	"latitude": {
		"required": false
	},
	"longitude": {
		"required": false
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
	}
};