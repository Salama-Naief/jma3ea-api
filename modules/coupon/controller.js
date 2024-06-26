// Carts Controller
const common = require('../../libraries/common');
const status_message = require('../../enums/status_message');
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");
const { resetPrice } = require('../product/utils');


/**
 * Add new product to Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove_coupon = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	let user = req.custom.authorizationObject;

	if (!req.body.code && req.query.code) {
		req.body.code = req.query.code;
	}

	const data = req.body;
	let coupon = null;

	if (!data.code) {
		return res.out({
			"code": req.custom.local.errors.required('coupon')
		}, status_message.VALIDATION_ERROR);
	}

	if (user.coupon) {
		if (user.coupon.code === data.code) {
			user.coupon = {
				code: null,
				member_id: null,
				value: 0,
				suppliers_coupons: []
			};
		} else {
			const coupon_index = user.coupon.suppliers_coupons ? user.coupon.suppliers_coupons.findIndex(c => c.code === data.code) : -1;
			if (coupon_index < 0) {
				return res.out({
					message: req.custom.local.unexpected_error
				}, status_message.NOT_FOUND);
			}
			user.coupon.suppliers_coupons.splice(coupon_index, 1);
		}


		if (user.cart) {
			const coupon_collection = req.custom.db.collection('coupon');
			const coupon = await coupon_collection.findOne({
				code: { '$regex': '^' + data.code + '$', $options: 'i' },
			}, { projection: { products: 1 } });
	
			if (coupon && coupon.products && coupon.products.length > 0) {
				for (const sku of coupon.products) {
					if (user.cart.hasOwnProperty(sku)) delete user.cart[sku];
				}
			}
		}

	}

	req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
		.then((response) => res.out({
			message: req.custom.local.cart_coupon_removed
		}, status_message.DELETED))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};
