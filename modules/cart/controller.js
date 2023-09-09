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

			let prods = [];
			if (user && user.cart) {
				for (const i of Object.keys(user.cart)) {
					prods.push(i.split('-')[0].toString());
				}
			}
			req.custom.clean_filter.sku = {
				'$in': prods
			};

			const prod_collection = req.custom.db.client().collection('product');
			const sku_arr = data.sku.split('-');
			const sku = sku_arr[0];

			prod_collection.findOne({
				status: true,
				sku: sku,
				"prod_n_storeArr.store_id": ObjectID(req.custom.authorizationObject.store_id)
			}).then((prod) => {

				if (!prod) {
					console.log('No product! ', sku);
					return res.out({
						'message': req.custom.local.cart_product_unavailable,
						cart_products: user.cart
					}, status_message.VALIDATION_ERROR);
				}

				let selected_product = prod;
				if (data.sku !== sku && prod.variants && prod.variants.length > 0) {
					const variant = prod.variants.find((i) => i.sku.toString() === data.sku.toString());

					if (!variant) {
						console.log('No variant!');
						return res.out({
							'message': req.custom.local.cart_product_unavailable,
							cart_products: user.cart
						}, status_message.VALIDATION_ERROR);
					}

					console.log('PROD: ', prod);
					console.log('VARIANT: ', variant);

					selected_product = {
						sku: variant.sku,
						prod_n_storeArr: variant.prod_n_storeArr,
						max_quantity_cart: variant.max_quantity_cart || prod.max_quantity_cart,
					};

				}

				const old_quantity = user.cart[data.sku] ? user.cart[data.sku] : 0;
				user.cart[data.sku] = data.quantity;

				if (!data.quantity) {
					delete user.cart[data.sku];
				}

				const total_products = Object.keys(user.cart).length;

				const prods_obj_skus = Object.keys(user.cart).map((i) => i.toString().split('-')[0]);

				const projection = {
					sku: 1,
					price: 1,
					old_price: 1,
					discount_price_valid_until: 1,
					variants: 1,
				};

				req.custom.clean_filter.sku = {
					'$in': prods_obj_skus
				};
				mainController.list(req, res, 'product', projection, (rows) => {
					const products = [];
					for (const p of rows.data) {

						// If the product has an expired discount price
						// Set the price to the old one
						/* if (p.old_price && p.discount_price_valid_until < new Date()) {
							const oldPrice = parseFloat(p.old_price);
							p.price = oldPrice;
							resetPrice(req, p.sku, oldPrice).then(isPriceResetted => {
								if (!isPriceResetted) {
									res.out({
										message: req.custom.local.unexpected_error
									}, status_message.UNEXPECTED_ERROR);
								}
							});
						} */


						// Check if the product sku in the cart exists in the main product
						// Then we check for product variations
						if (Object.keys(user.cart).indexOf(p.sku) > -1) {
							products.push(p);
						} else if (p.variants && p.variants.length > 0) {
							for (const v of p.variants) {
								if (Object.keys(user.cart).indexOf(v.sku) > -1) {
									products.push({
										sku: v.sku,
										price: parseFloat(v.price || p.price),
										prod_n_inventoryArr: v.prod_n_inventoryArr,
									});
									prod.sku = v.sku;
									prod.price = parseFloat(v.price || p.price);
								}
							}
						}

					}


					let total_quantities = 0;
					let total_prices = 0;
					for (const i of Object.keys(user.cart)) {
						total_quantities += user.cart[i];
						const product = products.find((p) => p.sku.toString() === i.toString());
						if (product) {
							total_prices += product.price * user.cart[i];
						}
					}

					for (const store of selected_product.prod_n_storeArr) {
						if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
							if (store.feed_from_store_id) {
								const temp_store = selected_product.prod_n_storeArr.find((i) => i.store_id.toString() == store.feed_from_store_id.toString());
								store.quantity = temp_store.quantity;
							}
							if (store.quantity < data.quantity || (selected_product.max_quantity_cart && selected_product.max_quantity_cart < data.quantity)) {
								const curr_product = products.find((p) => p.sku.toString() === data.sku.toString());
								return res.out({
									'message': req.custom.local.cart_product_exceeded_allowed,
									total_products: total_products,
									total_quantities: old_quantity,
									total_prices: common.getFixedPrice(total_prices - parseFloat(curr_product.price) * (total_quantities - old_quantity)),
									cart_products: user.cart
								}, status_message.VALIDATION_ERROR);
							}
							if (store.status == false) {
								return res.out({
									'message': req.custom.local.cart_product_unavailable,
									cart_products: user.cart
								}, status_message.VALIDATION_ERROR);
							}
							break;
						}
					}

					req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
						.then((response) => res.out({
							message: req.custom.local.cart_product_added,
							total_products: total_products,
							total_quantities: total_quantities,
							total_prices: common.getFixedPrice(total_prices),
							cart_products: user.cart
						}, status_message.CREATED))
						.catch((error) => res.out({
							'message': error.message
						}, status_message.UNEXPECTED_ERROR));
				});

			})
			// .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

		})
	// .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
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
	req.body.sku = req.params.Id;


	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}


			let user = req.custom.authorizationObject;
			user.cart = user.cart || {};
			user.hash = null;
			const keys = Object.keys(user.cart);
			if (keys.indexOf(data.sku.toString()) === -1) {
				return res.out({
					'message': req.custom.local.cart_product_not
				}, status_message.NO_DATA)
			}
			delete user.cart[data.sku];

			const total_products = Object.keys(user.cart).length;
			const prods_obj_skus = Object.keys(user.cart).map((i) => i.toString().split('-')[0]);
			const projection = {
				sku: 1,
				price: 1,
				prod_n_storeArr: 1,
				variants: 1,
			};

			req.custom.clean_filter.sku = {
				'$in': prods_obj_skus
			};
			mainController.list(req, res, 'product', projection, (rows) => {

				let products = [];

				for (const p of rows.data) {

					// Check if the product sku in the cart exists in the main product
					// Then we check for product variations
					if (Object.keys(user.cart).indexOf(p.sku) > -1) {
						products.push(p);
					} else if (p.variants && p.variants.length > 0) {
						for (const v of p.variants) {
							if (Object.keys(user.cart).indexOf(v.sku) > -1) {
								const options_names = v.options ? v.options.map((v_option) => v_option.name[req.custom.lang] || v_option.name[req.custom.config.local]) : [];
								products.push({
									sku: v.sku,
									quantity: user.cart[v.sku.toString()],
									max_quantity_cart: parseFloat(v.max_quantity_cart || p.max_quantity_cart),
									price: parseFloat(v.price || p.price),
								});
							}
						}
					}

				}


				let total_quantities = 0;
				let total_prices = 0;
				for (const i of Object.keys(user.cart)) {
					total_quantities += user.cart[i];
					const product = products.find((p) => p.sku.toString() === i.toString());
					if (product) {
						total_prices += product.price * user.cart[i];
					}
				}

				req.custom.cache.set(req.custom.token, user)
					.then((response) => res.out({
						message: req.custom.local.cart_product_removed,
						total_products: total_products,
						total_quantities: total_quantities,
						total_prices: common.getFixedPrice(total_prices),
					}, status_message.DELETED))
					.catch((error) => res.out({
						'message': error.message
					}, status_message.UNEXPECTED_ERROR));
			});

		}).
		catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};

/**
 * Clear the cart
 * @param {Object} req 
 * @param {Object} res 
 * @returns 
 */
module.exports.clear = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	let user = req.custom.authorizationObject;
	user.cart = {};
	user.hash = null;

	req.custom.cache.set(req.custom.token, user)
		.then((response) => res.out({
			message: req.custom.local.cart_cleared
		}, status_message.DELETED))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));

	/* let prods = [];
	for (const i of Object.keys(user.cart)) {
		prods.push(i.split('-')[0]);
	}

	const cache = req.custom.cache;
	const cache_key = `supplier_all_solid`;
	all_suppliers = await cache.get(cache_key).catch((e) => console.error(e));
	if (!all_suppliers) {
		const supplier_collection = req.custom.db.client().collection('supplier');
		all_suppliers = await supplier_collection.find({}).toArray() || [];
		if (all_suppliers) {
			cache.set(cache_key, all_suppliers, req.custom.config.cache.life_time).catch((e) => console.error(e));
		}
	}

	if (all_suppliers.length > 0) {
		const internalSuppliersIds = all_suppliers.filter(sup => {
			if (!sup.is_external) {
				return sup;
			}
		}).map(s => {
			if (s._id && ObjectID.isValid(s._id)) {
				return new ObjectID(s._id);
			}
		});

		req.custom.clean_filter['$or'] = [
			{ "supplier_id": { $exists: false } },
			{
				"supplier_id": {
					$in: internalSuppliersIds
				}
			},
		]
	}

	req.custom.clean_filter.sku = {
		'$in': prods
	};

	req.custom.limit = 1000;

	mainController.list(req, res, 'product', {
		"_id": 1,
		"sku": 1,
		"supplier_id": 1,
	}, async (out) => {
		if (out.data.length === 0) {
			user.cart = {};
		} else {
			for (let product of out.data) {
				const cartKeys = Object.keys(user.cart);
				for (const i of cartKeys) {
					const sku = i.split('-')[0];
					if (sku != product.sku) {
						delete user.cart[i];
					}
				}
			}
		}


	}); */

}


/**
 * List all products in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const mainController = require("../../libraries/mainController");
	let user = req.custom.authorizationObject;

	let prods = [];
	if (user && user.cart) {
		for (const i of Object.keys(user.cart)) {
			prods.push(i.split('-')[0]);
		}
	}

	const profile = require('../profile/controller');
	let user_info = await profile.getInfo(req, {
		_id: 1,
		pro: 1
	}).catch((e) => console.error(e));

	let hasFreeShipping = false;

	if (user_info && user_info.pro && user_info.pro.active) {
		if (user_info.pro.endDate > new Date()) {
			hasFreeShipping = true;
		}
	}

	req.custom.clean_filter.sku = {
		'$in': prods
	};

	mainController.list(req, res, 'product', {
		"_id": 0,
		"sku": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"picture": 1,
		"price": 1,
		"prod_n_storeArr": 1,
		"prod_n_categoryArr": 1,
		"variants": 1,
		"old_price": 1
	}, (products_data) => {
		out = {};
		out.success = true;
		out.data = [];

		const store_id = req.custom.authorizationObject.store_id;
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

				out.shipping_cost = hasFreeShipping ? 0 : parseInt(cityObj.shipping_cost);
				let total = 0;

				// Total price of products that don't have a discount price
				let totalWithNoDiscount = 0;

				let products = [];
				for (const p of products_data.data) {

					// Check if the product sku in the cart exists in the main product
					// Then we check for product variations
					if (Object.keys(user.cart).indexOf(p.sku.toString()) > -1) {
						products.push(p);
					} else if (p.variants && p.variants.length > 0) {
						for (const v of p.variants) {
							if (Object.keys(user.cart).indexOf(v.sku.toString()) > -1) {
								const options_names = v.options ? v.options.map((v_option) => v_option.name[req.custom.lang] || v_option.name[req.custom.config.local]) : [];

								let variant = {};
								variant.sku = v.sku;
								variant.name = v.name && v.name[req.custom.lang] ? v.name[req.custom.lang] : p.name;
								variant.name += ' - ' + options_names.join('-');
								variant.quantity = v.sku;
								variant.prod_n_storeArr = v.prod_n_storeArr;
								variant.prod_n_categoryArr = p.prod_n_categoryArr ? p.prod_n_categoryArr : [];
								variant.max_quantity_cart = v.max_quantity_cart || p.max_quantity_cart;
								variant.price = parseFloat(v.price || p.price);
								variant.old_price = parseFloat(v.old_price || 0);
								variant.discount_price_valid_until = v.discount_price_valid_until;
								if (v.gallery_pictures && v.gallery_pictures[0]) {
									variant.picture = req.custom.config.media_url + v.gallery_pictures[0];
								}
								products.push(variant);
							}
						}
					}

				}

				for (const i of products) {

					if (!i || !i.sku) {
						continue;
					}

					i.quantity = user.cart[i.sku.toString()];
					for (const store of i.prod_n_storeArr) {
						if (store.feed_from_store_id) {
							const temp_store = i.prod_n_storeArr.find((inv) => inv.store_id.toString() == store.feed_from_store_id.toString());
							store.quantity = temp_store.quantity;
						}
						if (store.store_id.toString() == store_id) {
							if (store.status == false || store.quantity <= 0) {
								i.quantity = 0;
								i.warning = req.custom.local.cart_product_unavailable;
							} else if (store.quantity < i.quantity || (i.max_quantity_cart && i.max_quantity_cart < products_data.quantity)) {
								i.quantity = store.quantity;
								i.warning = req.custom.local.cart_product_exceeded_allowed_updated;
							}
							break;
						}
					}

					total += i.price * i.quantity;
					if (!i.old_price || i.old_price <= 0) {
						totalWithNoDiscount += i.price * i.quantity;
					}
					delete i.prod_n_storeArr;
					delete i.variants;
					out.data.push(i);

				}

				out.subtotal = total.toFixed(3);
				out.total_quantities = out.data.reduce((acc, curr) => acc + curr.quantity, 0);
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
					let totalToApplyCoupon = coupon.apply_on_discounted_products ? out.subtotal : totalWithNoDiscount;
					// let totalToApplyCoupon = totalWithNoDiscount;
					out.coupon = {
						code: coupon ? coupon.code : null,
						value: coupon ? (coupon.percent_value ? (totalToApplyCoupon * coupon.percent_value) / 100 : coupon.discount_value) : 0
					};

					out.total = total + out.shipping_cost - out.coupon.value;
					out.total = (out.total > 0 ? out.total : 0).toFixed(3);

					res.out(out);

				})
				// .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));

			})
		// .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
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
		suppliers_coupons: user.coupon && user.coupon.suppliers_coupons && Array.isArray(user.coupon.suppliers_coupons) ? user.coupon.suppliers_coupons : []
	};

	req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
		.then(() => {

			const collection = req.custom.db.client().collection('coupon');
			collection.findOne({
				code: { '$regex': '^' + data.code + '$', $options: 'i' },
				$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } }],
				status: true
			}).
				then(async (coupon) => {

					if (!coupon) {
						return res.out({
							"code": req.custom.local.cart_coupon_unavailable
						}, status_message.VALIDATION_ERROR);
					}

					// Return error if there's no supplier for this coupon
					if (coupon.supplier_id) {
						//const mainController = require("../../libraries/mainController");
						let prods = [];
						if (user && user.cart) {
							for (const i of Object.keys(user.cart)) {
								prods.push(i.split('-')[0]);
							}
						}

						const product_collection = req.custom.db.client().collection('product');
						const data = await product_collection.find({
							sku: { $in: prods },
							status: true
						}).toArray();

						if (!data || data.length < 0 || data.findIndex(p => p.supplier_id && p.supplier_id.toString() === coupon.supplier_id.toString()) < 0) {
							return res.out({
								"code": req.custom.local.cart_coupon_unavailable
							}, status_message.VALIDATION_ERROR);
						}
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

							if (coupon.supplier_id) {
								user.coupon.member_id = coupon ? (coupon.member_id || null) : null;
								const index = user.coupon.suppliers_coupons.findIndex(c => c.code === coupon.code);
								if (index < 0) {
									user.coupon.suppliers_coupons.push({
										supplier_id: coupon.supplier_id,
										code: coupon.code,
										value: coupon.code ? (coupon.percent_value || coupon.discount_value) : 0
									});
								} else {
									user.coupon.suppliers_coupons.splice(index, 1);
									user.coupon.suppliers_coupons.push({
										supplier_id: coupon.supplier_id,
										code: coupon.code,
										value: coupon.code ? (coupon.percent_value || coupon.discount_value) : 0
									});
								}
							} else if (coupon.only_for_jm3eia) {
								try {
									console.log('it is only for jm3eia!');
									console.log('Before: ', user.coupon);
									user.coupon.member_id = coupon ? (coupon.member_id || null) : null;
									const index = user.coupon.suppliers_coupons.findIndex(c => c.code === coupon.code);
									if (index < 0) {
										user.coupon.suppliers_coupons.push({
											supplier_id: req.custom.settings['site_id'],
											code: coupon.code,
											value: coupon.code ? (coupon.percent_value || coupon.discount_value) : 0
										});
									} else {
										user.coupon.suppliers_coupons.splice(index, 1);
										user.coupon.suppliers_coupons.push({
											supplier_id: req.custom.settings['site_id'],
											code: coupon.code,
											value: coupon.code ? (coupon.percent_value || coupon.discount_value) : 0
										});
									}
									console.log('After: ', user.coupon);
								} catch (err) {
									console.log(err);
								}
							} else {
								user.coupon = {
									code: coupon.code || null,
									member_id: coupon ? (coupon.member_id || null) : null,
									value: coupon.code ? (coupon.percent_value || coupon.discount_value) : 0,
									suppliers_coupons: []
								};
							}

							req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
								.then((response) => res.out({
									message: req.custom.local.cart_coupon_added,
									note: req.custom.local.cart_coupon_only_no_discounted_products,
									apply_on_discounted_products: coupon.apply_on_discounted_products,
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


/**
 * Claim the offer
 */
module.exports.offer = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	let user = req.custom.authorizationObject;

	const data = req.body;

	if (!data.offer_id || data.offer_id != user.offer.viewed_offer_id) {
		return res.out({}, status_message.VALIDATION_ERROR);
	}

	if (!user.offer) user.offer = {
		offer_id: null,
		viewed_offer_id: null
	};

	const collection = req.custom.db.client().collection('offer');

	try {
		const offer = await collection.findOne({ _id: ObjectID(data.offer_id), status: true });
		if (!offer) {
			return res.out({
				code: "Offer not found."
			}, status_message.VALIDATION_ERROR);
		}

		/* if (offer.type == 'giveaway') {
			if (!user.member_id) {
				return res.out({
					message: "Please login or create an account to claim the offer",
				});
			}
			const giveaway_entries_collection = req.custom.db.client().collection('giveaway_entries');

			await giveaway_entries_collection.insertOne({
				offer_id: ObjectID(data.offer_id),
				member_id: ObjectID(user.member_id.toString()),
				entry_date: common.getDate()
			});
		} */
		user.offer.offer_id = data.offer_id;
	} catch (e) {
		console.error(e);
		res.out({
			'message': e.message
		}, status_message.UNEXPECTED_ERROR)
	}
	req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
		.then((response) => res.out({
			message: req.custom.local.cart_product_added
		}, status_message.CREATED))
		.catch((e) => {
			console.error(e);
			res.out({
				'message': e.message
			}, status_message.UNEXPECTED_ERROR)
		});
}