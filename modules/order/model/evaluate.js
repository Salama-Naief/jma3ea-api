// Order/evaluate model
const Field = require("@big_store_core/base/libraries/field");

module.exports = {
	"driver": new Field({
		"required": true,
		"type": Number,
		"min": 0,
		"max": 10,
	}),
};