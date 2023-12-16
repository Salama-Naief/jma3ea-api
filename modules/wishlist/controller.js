// Carts Controller
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const profile = require('../profile/controller');
const collectionName = 'member';

/**
 * Add new product to Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.model = req.custom.model || require('./model/add');

	req.custom.getValidData(req).
		then(({ data, error }) => {

			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}
			let user = req.custom.authorizationObject;

			const prod_collection = req.custom.db.collection('product');
			prod_collection.findOne({
				sku: data.sku,
				status: true,
				"prod_n_storeArr.store_id": ObjectID(req.custom.authorizationObject.store_id)
			}).then((prod) => {

				if (!prod) {
					return res.out({
						'message': req.custom.local.wishlist_product_unavailable
					}, status_message.VALIDATION_ERROR);
				}

				user.wishlist = user.wishlist || [];
				if (user.wishlist.indexOf(data.sku.toString()) === -1) {
					user.wishlist.push(data.sku.toString());
				}

				req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
					.then((response) => res.out({
						message: req.custom.local.wishlist_product_added
					}, status_message.CREATED))
					.catch((error) => res.out({
						'message': error.message
					}, status_message.UNEXPECTED_ERROR));

				updateWishlist(req, user);

			}).
				catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

		}).
		catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

};

/**
 * Remove product from Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.model = req.custom.model || require('./model/remove');
	req.body.sku = req.params.sku;

	req.custom.getValidData(req).
		then(({ data, error }) => {

			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}
			let user = req.custom.authorizationObject;
			user.wishlist = user.wishlist || [];
			if (user.wishlist.indexOf(data.sku.toString()) === -1) {
				return res.out({
					'message': req.custom.local.wishlist_product_not
				}, status_message.NO_DATA)
			} else {
				user.wishlist = user.wishlist.filter((elm) => elm != data.sku.toString());

				req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
					.then((response) => res.out({
						message: req.custom.local.wishlist_product_removed
					}, status_message.DELETED))
					.catch((error) => res.out({
						'message': error.message
					}, status_message.UNEXPECTED_ERROR));
			}

			updateWishlist(req, user);

		}).
		catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};

/**
 * List all products in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const mainController = require("../../libraries/mainController");

	profile.getInfo(req).
		then((user) => {


			let prods = [];
			if (user && user.wishlist) {
				for (const i of user.wishlist) {
					prods.push(i.toString());
				}
			}
			req.custom.clean_filter.sku = {
				'$in': prods
			};
			req.custom.isProducts == true;
			mainController.list(req, res, 'product', {
				"sku": 1,
				"name": {
					$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
				},
				"picture": 1,
				"price": 1,
				"prod_n_categoryArr": 1,
			}, (data) => {

				let user_obj = req.custom.authorizationObject;
				user_obj.cart = user_obj.cart || {};

				data.data.map((i) => {
					i.prod_n_categoryArr = i.prod_n_categoryArr[0];

					const prod_exists_in_cart = Object.keys(user_obj.cart).indexOf(i.sku.toString()) > -1;
					i.cart_status = {
						is_exists: prod_exists_in_cart,
						quantity: prod_exists_in_cart ? user_obj.cart[i.sku] : 0
					};

					return i;
				});
				res.out(data.data.sort((a, b) => {
					const prodA = a.prod_n_categoryArr.category_id;
					const prodB = b.prod_n_categoryArr.category_id;

					let comparison = 0;
					if (prodA > prodB) {
						comparison = 1;
					} else if (prodA < prodB) {
						comparison = -1;
					}

					return comparison;
				}).map((i) => {
					delete i.prod_n_categoryArr;
					return i;
				}));
			});

		});

};

function updateWishlist(req, user) {
	const collection = req.custom.db.collection(collectionName);
	return user.member_id ? collection.updateOne({
		_id: ObjectID(user.member_id.toString())
	}, {
		$set: {
			wishlist: user.wishlist,
		}
	}) : false;
}