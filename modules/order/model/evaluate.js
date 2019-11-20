// Checkout/Buy model
const ObjectID = require("mongodb").ObjectID;
const enums = require("../../../libraries/enums");

module.exports = {
	"driver": {
		"required": true,
		"type": Number,
		"min": 0,
		"max": 10,
	},
};