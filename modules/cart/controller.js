// Carts Controller
const common = require('../../libraries/common');
const status_message = require('../../enums/status_message');
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");

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
			user.cart = user.cart || {};
			user.hash = null;

			const prod_collection = req.custom.db.client().collection('product');

			prod_collection.findOne({
				_id: data.product_id,
				status: true,
				"prod_n_storeArr.store_id": ObjectID(req.custom.authorizationObject.store_id)
			}).then((prod) => {

				if (!prod) {
					return res.out({
						'message': req.custom.local.cart_product_unavailable
					}, status_message.VALIDATION_ERROR);
				}


				for (const store of prod.prod_n_storeArr) {
					if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
						if (store.feed_from_store_id) {
							const temp_store = prod.prod_n_storeArr.find((i) => i.store_id.toString() == store.feed_from_store_id.toString());
							store.quantity = temp_store.quantity;
						}
						if (store.quantity < data.quantity || (prod.max_quantity_cart && prod.max_quantity_cart < data.quantity)) {
							return res.out({
								'message': req.custom.local.cart_product_exceeded_allowed
							}, status_message.VALIDATION_ERROR);
						}
						if (store.status == false) {
							return res.out({
								'message': req.custom.local.cart_product_unavailable
							}, status_message.VALIDATION_ERROR);
						}
						break;
					}
				}

				user.cart[data.product_id] = data.quantity;

				if (!data.quantity) {
					delete user.cart[data.product_id];
				}

				const total_products = Object.keys(user.cart).length;

				const prods_obj_ids = Object.keys(user.cart).map((i) => ObjectID(i));

				const projection = {
					_id: 1,
					price: 1,
				};

				req.custom.clean_filter._id = {
					'$in': prods_obj_ids
				};
				mainController.list(req, res, 'product', projection, (rows) => {
					const products = rows.data;
					let total_quantities = 0;
					let total_prices = 0;
					for (const i of Object.keys(user.cart)) {
						total_quantities += user.cart[i];
						const product = products.find((p) => p._id.toString() === i.toString());
						if (product) {
							total_prices += product.price * user.cart[i];
						}
					}

					req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
						.then((response) => res.out({
							message: req.custom.local.cart_product_added,
							total_products: total_products,
							total_quantities: total_quantities,
							total_prices: common.getRoundedPrice(total_prices),
						}, status_message.CREATED))
						.catch((error) => res.out({
							'message': error.message
						}, status_message.UNEXPECTED_ERROR));
				});

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
	req.body.product_id = req.params.Id;


	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}


			let user = req.custom.authorizationObject;
			user.cart = user.cart || {};
			user.hash = null;
			const keys = Object.keys(user.cart);
			if (keys.indexOf(data.product_id.toString()) === -1) {
				return res.out({
					'message': req.custom.local.cart_product_not
				}, status_message.NO_DATA)
			}
			delete user.cart[data.product_id];

			const total_products = Object.keys(user.cart).length;
			const prods_obj_ids = Object.keys(user.cart).map((i) => ObjectID(i));
			const projection = {
				_id: 1,
				price: 1,
			};

			req.custom.clean_filter._id = {
				'$in': prods_obj_ids
			};
			mainController.list(req, res, 'product', projection, (rows) => {
				const products = rows.data;
				let total_quantities = 0;
				let total_prices = 0;
				for (const i of Object.keys(user.cart)) {
					total_quantities += user.cart[i];
					const product = products.find((p) => p._id.toString() === i.toString());
					if (product && product.price) {
						total_prices += product.price * user.cart[i];
					}
				}

				req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
					.then((response) => res.out({
						message: req.custom.local.cart_product_removed,
						total_products: total_products,
						total_quantities: total_quantities,
						total_prices: common.getRoundedPrice(total_prices),
					}, status_message.CREATED))
					.catch((error) => res.out({
						'message': error.message
					}, status_message.UNEXPECTED_ERROR));
			});

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
	let user = req.custom.authorizationObject;
	let prods = [];
	if (user && user.cart) {
		for (const i of Object.keys(user.cart)) {
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
		"prod_n_storeArr": 1
	}, (data) => {
		out = {};
		out.success = true;

		const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';
		if (!cityid) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, status_message.CITY_REQUIRED);
		}
		const city_collection = req.custom.db.client().collection('city');
		city_collection
			.findOne({
				_id: ObjectID(cityid)
			})
			.then((cityObj) => {

				if (!cityObj) {
					return res.out({
						'message': req.custom.local.choose_city_first
					}, status_message.CITY_REQUIRED);
				}

				out.shipping_cost = parseInt(cityObj.shipping_cost);
				let total = 0;
				out.data = data.data.map((i) => {

					i.quantity = user.cart[i._id.toString()];
					for (const store of i.prod_n_storeArr) {
						if (store.feed_from_store_id) {
							const temp_store = prod.prod_n_storeArr.find((i) => i.store_id.toString() == store.feed_from_store_id.toString());
							store.quantity = temp_store.quantity;
						}
						if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
							if (store.status == false || store.quantity <= 0) {
								i.quantity = 0;
								i.warning = req.custom.local.cart_product_unavailable;
							} else if (store.quantity < i.quantity || (i.max_quantity_cart && i.max_quantity_cart < data.quantity)) {
								i.quantity = store.quantity;
								i.warning = req.custom.local.cart_product_exceeded_allowed_updated;
							}
							break;
						}
					}

					total += i.price * i.quantity;
					delete i.prod_n_storeArr;
					return i;
				});

				out.subtotal = total.toFixed(3);
				if (!user.coupon || !user.coupon.code) {
					out.total = total + out.shipping_cost;
					out.total = (out.total > 0 ? out.total : 0).toFixed(3);

					res.out(out);
					return;
				}

				// Calculate coupon discount
				const coupon_collection = req.custom.db.client().collection('coupon');
				coupon_collection.findOne({
					code: user.coupon && user.coupon.code ? user.coupon.code : null,
					$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } }],
					status: true,
				}).then((coupon) => {
					out.coupon = {
						code: coupon ? coupon.code : null,
						value: coupon ? (coupon.percent_value ? (out.subtotal * coupon.percent_value) / 100 : coupon.discount_value) : 0
					};

					out.total = total + out.shipping_cost - out.coupon.value;
					out.total = (out.total > 0 ? out.total : 0).toFixed(3);

					res.out(out);

				}).
					catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

			}).
			catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
	});
};

/**
 * Add new product to Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.coupon = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	let user = req.custom.authorizationObject;


	const data = req.body;
	let coupon = null;

	if (!data.code) {
		return res.out({
			"code": req.custom.local.errors.required('coupon')
		}, status_message.VALIDATION_ERROR);
	}

	user.coupon = {
		code: null,
		member_id: null,
		value: 0,
	};
	req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
		.then(() => {

			const collection = req.custom.db.client().collection('coupon');
			collection.findOne({ 
				code: data.code,
				$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } }], 
				status: true
			 }).
				then((coupon) => {

					if (!coupon) {
						return res.out({
							"code": req.custom.local.cart_coupon_unavailable
						}, status_message.VALIDATION_ERROR);
					}

					const coupon_token_collection = req.custom.db.client().collection('coupon_token');
					coupon_token_collection.findOne({ coupon: coupon.code, token: req.custom.token }).
						then((coupon_token) => {


							if ((!coupon || coupon.number_of_uses >= coupon.max_uses) ||
								(coupon_token && coupon_token.number_of_uses >= coupon.max_uses_per_user)) {
								return res.out({
									"code": req.custom.local.cart_coupon_unavailable
								}, status_message.VALIDATION_ERROR);
							}

							if (coupon.member_id && (!user.member_id || (user.member_id && coupon.member_id.toString() !== user.member_id.toString()))) {
								return res.out({
									"code": req.custom.local.cart_coupon_unavailable
								}, status_message.VALIDATION_ERROR);
							}

							user.coupon = {
								code: data.code || null,
								member_id: coupon ? (coupon.member_id || null) : null,
								value: data.code ? (coupon.percent_value || coupon.discount_value) : 0,
							};


							req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
								.then((response) => res.out({
									message: req.custom.local.cart_coupon_added
								}, status_message.CREATED))
								.catch((error) => res.out({
									'message': error.message
								}, status_message.UNEXPECTED_ERROR));


						}).
						catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

				}).
				catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

		})
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};
