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
		"order_id": 1,
		"payment_method": 1,
		"subtotal": 1,
		"total": 1,
		"created": 1,
		"status": 1,
		"evaluation": 1,
	}, (results) => {
		results.data = results.data.map((i) => {
			i.status = req.custom.local.order_status_list[i.status];
			return i;
		});
		res.out(results);
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
		.then((order) => {
			let products = [];
			for (const supplier_key of Object.keys(order.products)) {
				products[supplier_key] = order.products[supplier_key].map((p)=>{
					p.name = p.name[req.custom.lang] || p.name[req.custom.config.local];
					return p;
				});  
			}
			order.status = req.custom.local.order_status_list[order.status];
			res.out(order);
		})
		.catch((err) => res.out({
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
			message: req.custom.local.thanks_for_evaluation
		}))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.repeat = function (req, res) {
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
		.then((order) => {
			const products = {};
			Object.keys(order.products).forEach((key) => {
				for (const prod of order.products[key]) {
					products[prod._id.toString()]= prod.quantity;
				}
			});

			let user = req.custom.authorizationObject;
			user.cart = products;
			req.custom.cache.set(req.custom.token, user)
				.then((response) => res.out({
					message: req.custom.local.cart_repeated
				}, enums.status_message.CREATED))
				.catch((error) => res.out({
					'message': error.message
				}, enums.status_message.UNEXPECTED_ERROR));


		})
		.catch((err) => res.out({
			'message': err.message
		}, enums.status_message.UNEXPECTED_ERROR));
};