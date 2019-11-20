// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const enums = require('../../libraries/enums');
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

/**
 * Evaluation order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.evaluate = async function (req, res) {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	req.custom.model = require('./model/evaluate');
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const row = await collection.findOne({
			_id: ObjectID(req.params.Id)
		})
		.then((order_row) => order_row)
		.catch((e) => null);

	if (!row) {
		return res.out({
			"message": req.custom.local.no_data_found
		}, enums.status_message.VALIDATION_ERROR);
	}

	if (row.evaluation) {
		return res.out({
			"message": req.custom.local.evaluated_before
		}, enums.status_message.VALIDATION_ERROR);
	}

	collection.updateOne({
			_id: ObjectID(req.params.Id)
		}, {
			$set: {
				evaluation: {
					driver: data.driver
				}
			}
		})
		.then((response) => res.out({
			message: req.custom.local.saved_done
		}))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};