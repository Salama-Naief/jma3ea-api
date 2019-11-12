// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require('mongodb').ObjectID;
const collectionName = 'order';

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	req.custom.clean_filter = req.custom.clean_filter || {};
	req.custom.clean_filter['user_data._id'] = ObjectID(req.custom.authorizationObject.member_id);
	req.custom.all_status = true;
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"payment_method": 1,
		"subtotal": 1,
		"total": 1,
		"created": 1,
	});
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}

	const collection = req.custom.db.client().collection('order');
	collection.findOne({
			_id: ObjectID(req.params.Id),
		})
		.then((order) => res.out(order))
		.catch(() => res.out({
			'message': err.message
		}, enums.status_message.UNEXPECTED_ERROR));
};