// Order/evaluate model
const Field = require("../../libraries/field");

module.exports = {
	"driver": new Field({
		"required": true,
		"type": Number,
		"min": 0,
		"max": 10,
	}),
};