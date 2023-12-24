// Checkout/Buy model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");
const config = require("../../../config");

module.exports = {
	"reward_id": new Field({
        "type": ObjectID,
		"required": true,
        "collection": 'reward'
	}),
};