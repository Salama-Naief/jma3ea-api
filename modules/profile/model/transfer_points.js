// Profile/Wallet/Add model
const Field = require("../../../libraries/field");
const ObjectID = require("../../../types/object_id");

module.exports = {
	"order_id": new Field({
		"required": true,
		"type": ObjectID,
		"collection": "order"
	}),
	"mobile": new Field({
		"type": String,
		"required": true,
		"collection": "member"
	}),
};