// Carts Controller
const enums = require('../../libraries/enums');
const ObjectID = require('mongodb').ObjectID;

/**
 * Add new product to Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	req.custom.model = require('./model/add');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	let user = req.custom.authorizationObject;

	const prod_collection = req.custom.db.client().collection('product');

	const prod = await prod_collection.findOne({
		_id: data.product_id,
		status: true,
		"prod_n_storeArr.store_id": ObjectID(req.custom.authorizationObject.store_id)
	}).then((prod) => prod).catch(() => null);

	if (!prod) {
		return res.out({
			'message': req.custom.local.wishlist_product_unavailable
		}, enums.status_message.VALIDATION_ERROR);
	}

	user.wishlist = user.wishlist || [];
	user.wishlist.push(data.product_id.toString());

	req.custom.cache.set(req.custom.token, user)
		.then((response) => res.out({
			message: req.custom.local.wishlist_product_added
		}, enums.status_message.CREATED))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Remove product from Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	req.custom.model = require('./model/remove');
	req.body.product_id = req.params.Id;
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	let user = req.custom.authorizationObject;
	user.wishlist = user.wishlist || [];
	if (user.wishlist.indexOf(data.product_id.toString()) === -1) {
		return res.out({
			'message': req.custom.local.wishlist_product_not
		}, enums.status_message.NO_DATA)
	} else {
		user.wishlist = user.wishlist.filter((elm)=> elm != data.product_id.toString());

		req.custom.cache.set(req.custom.token, user)
			.then((response) => res.out({
				message: req.custom.local.wishlist_product_removed
			}, enums.status_message.DELETED))
			.catch((error) => res.out({
				'message': error.message
			}, enums.status_message.UNEXPECTED_ERROR));
	}
};

/**
 * List all products in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const mainController = require("../../libraries/mainController");
	const ObjectID = require('mongodb').ObjectID;
	let user = req.custom.authorizationObject;
	let prods = [];
	if (user && user.wishlist) {
		for (const i of user.wishlist) {
			prods.push(ObjectID(i));
		}
	}
	req.custom.clean_filter._id = {
		'$in': prods
	};
	mainController.list(req, res, 'product', {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"picture": 1,
		"price": 1,
	}, async (data) => {
		res.out(data.data);
	});
};
