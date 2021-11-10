// Add wishlist model
const ObjectID = require("../../../types/object_id");
const Field = require("../../../libraries/field");

module.exports = {
	"sku": new Field({
		"required": true,
	})
};