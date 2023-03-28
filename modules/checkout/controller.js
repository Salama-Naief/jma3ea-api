// Checkout Controller
const enums_payment_methods = require('../../enums/payment_methods');
const common = require('../../libraries/common');
const mail = require('../../libraries/mail');
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const { v4: uuid } = require('uuid');
const mainController = require("../../libraries/mainController");
const mail_view = require("./view/mail");
const moment = require('moment');
const axios = require('axios');
const shortid = require('shortid');
const { mergeDeliveryTimes, cleanProduct, groupBySupplier, getAvailableOffer } = require('./utils');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');


const FLOWERS_CATEGORIES_IDS = [
	"62a1b7a3cfe3aa78d4e75603",
	"62a1b9a1cfe3aa78d4e75605",
	"6372450481280dbe72ef97b9"
]


/**
 * Buy product in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.buy = async function (req, res) {
	console.log('Body before the hash: ', req.body);
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	moment.updateLocale('en', {});
	const only_validation = req.query.validation !== undefined;

	const profile = require('../profile/controller');
	let user_info = await profile.getInfo(req, {
		_id: 1,
		fullname: 1,
		email: 1,
		mobile: 1,
		address: 1,
		addresses: 1,
		points: 1,
		wallet: 1,
		device_token: 1,
	}).catch(() => null);

	if (user_info) {
		req.body.user_data = user_info;
	}

	let hash = uuid().replace(/-/g, '');

	if (only_validation && !req.body.hash) {
		req.body.hash = hash;

		req.custom.authorizationObject.hash = hash;
		await req.custom.cache.set(req.custom.token, req.custom.authorizationObject, req.custom.config.cache.life_time.token);

	}

	req.custom.model = req.custom.model || require(`./model/buy_${user_info ? 'user' : 'visitor'}`);
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		console.log('VALIDATION ERROR HERE: ', error);
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	if (only_validation) {
		return res.out({
			message: true,
			hash: hash,
		});
	}

	if (user_info) {
		data.user_data = user_info;
		user_info.addresses = user_info.addresses || [];
		const address = user_info.addresses.find((i) => i.id == data.address_id);
		if (address) {
			data.user_data.address = address;
		}
		delete data.user_data.addresses;
	}

	// TODO: Fix checking hash  *|| req.custom.authorizationObject.hash != data.hash*
	if (!data.hash) {
		save_failed_payment(req, !data.hash ? 'NO_HASH' : 'HASH_NOT_VALID');
		return res.out({
			message: req.custom.local.hash_error
		}, status_message.VALIDATION_ERROR);
	}

	// TODO: Fix checking track id && req.body.hash != req.body.payment_details.trackid
	if (req.body.payment_method == 'knet' && req.body.payment_details && !req.body.payment_details.trackid) {
		save_failed_payment(req, 'TRACK_ID_NOT_VALID');
		return res.out({
			message: req.custom.local.hash_error
		}, status_message.VALIDATION_ERROR);
	}

	let user = req.custom.authorizationObject;
	user.cart = user.cart || {};
	let prods = [];
	if (user && user.cart) {
		for (const i of Object.keys(user.cart)) {
			prods.push(i.split('-')[0]);
		}
	}
	req.custom.clean_filter.sku = {
		'$in': prods
	};
	const up_cart = Object.assign({}, user.cart);
	req.custom.limit = 0;

	console.log('Body after the hash: ', req.body);
	mainController.list(req, res, 'product', {
		"_id": 1,
		"soft_code": 1,
		"sku": { $ifNull: [`$sku`, `$soft_code`] }, // TODO: Change to sku
		"name": 1,
		"categories": "$prod_n_categoryArr",
		"picture": 1,
		"price": 1,
		"uom": 1,
		"barcode": 1,
		"weight": 1,
		"prod_n_storeArr": 1,
		"supplier_id": 1,
		"variants": 1,
		"free_shipping": 1,
		"discount_price_valid_until": 1
	}, async (out) => {
		try {
			if (out.data.length === 0) {
				save_failed_payment(req, 'NO_PRODUCTS_IN_CART');
				return res.out({
					products: req.custom.local.cart_has_not_products
				}, status_message.NO_DATA);
			}

			const up_products = JSON.parse(JSON.stringify(out.data));

			let products2save = await products_to_save(out.data, user, req, true);

			const payment_method = enums_payment_methods(req).find((pm) => pm.id == data.payment_method);

			console.log('body suppliers: ', req.body.suppliers);

			if (req.body.suppliers) {
				if (req.body.suppliers.length > 0) {
					const suppliers_to_buy = req.body.suppliers.map(s => s.supplier_id);
					products2save = products2save.filter(p => suppliers_to_buy.includes(p.supplier._id.toString()));
				} else {
					return res.out({
						message: "No supplier selected"
					}, status_message.VALIDATION_ERROR);
				}
			}

			const total_prods = parseFloat(products2save.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0));

			if (user_info) {
				data.user_data._id = user_info._id;
				if (user_info.device_token) {
					data.user_data.device_token = user_info.device_token;
				}
			}

			const user_city_id = data.user_data && data.user_data.address && data.user_data.address.city_id ?
				data.user_data.address.city_id.toString() :
				req.custom.authorizationObject.city_id.toString();
			const city_collection = req.custom.db.client().collection('city');
			const cityObj = await city_collection
				.findOne({
					_id: ObjectID(user_city_id)
				})
				.then((c) => c)
				.catch(() => null);

			data.user_data.address.city_name = cityObj.name[req.custom.lang];

			const city_shipping_cost = parseFloat(cityObj.shipping_cost)
			let shipping_cost = 0;

			//const products = await products_to_save(out.data, user, req, true);
			const productsGroupedBySupplier = groupBySupplier(products2save);

			if (req.body.payment_method === 'cod' && productsGroupedBySupplier.find(s => s.supplier.allow_cod === false)) {
				save_failed_payment(req, 'PAYMENT_METHOD_NOT_ALLOWED');
				return res.out({
					products: req.custom.local.payment_method_not_allowed
				}, status_message.VALIDATION_ERROR);
			}

			const coupon_collection = req.custom.db.client().collection('coupon');
			const coupons = user.coupon && (user.coupon.code || user.coupon.suppliers_coupons) ? (await coupon_collection.find({
				code: user.coupon.code ? user.coupon.code : { $in: user.coupon.suppliers_coupons.map(c => c.code) },
				$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } },],
				status: true,
			}).toArray() || []) : null;

			const general_coupon = coupons ? coupons.find(c => !c.supplier_id && !c.only_for_jm3eia) : null;
			const suppliers_coupons = coupons ? coupons.filter(c => c.supplier_id || c.only_for_jm3eia).map(c => {
				if (c.only_for_jm3eia && !c.supplier_id) {
					c.supplier_id = req.custom.settings['site_id'];
				}
				return c;
			}) : [];

			const user_wallet = user_info ? user_info.wallet : 0;

			let total_coupon_value = 0;

			for (let sup of productsGroupedBySupplier) {
				let supplier_products_total = parseFloat(sup.products.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0) || 0);

				sup.subtotal = supplier_products_total;

				let supplier_shipping_cost = parseFloat(sup.supplier.shipping_cost) || city_shipping_cost;
				if (sup.supplier._id.toString() == req.custom.settings['site_id'] && sup.products.findIndex(p => p.free_shipping == true) > -1) {
					supplier_shipping_cost = 0;
				}
				shipping_cost += supplier_shipping_cost;

				if (!general_coupon && suppliers_coupons && suppliers_coupons.length > 0) {
					const supplier_coupon = suppliers_coupons.find(c => c.supplier_id.toString() == sup.supplier._id.toString());
					if (supplier_coupon) {
						sup.coupon = {
							supplier: {
								_id: sup.supplier._id,
								name: sup.supplier.name[req.custom.lang] || sup.supplier.name['en']
							},
							code: supplier_coupon.code,
							value: common.getFixedPrice(supplier_coupon.percent_value ? (parseFloat(supplier_products_total) * supplier_coupon.percent_value) / 100 : supplier_coupon.discount_value)
						}
						supplier_products_total -= parseFloat(sup.coupon.value || 0);
						total_coupon_value += parseFloat(sup.coupon.value || 0);
					}
				}

				const supplier_delivery_time = req.body.suppliers.length > 0 && typeof req.body.suppliers[0] == 'object' ? req.body.suppliers.find(s => s.supplier_id == sup.supplier._id).delivery_time : req.body.delivery_time;
				const delivery_time = moment(supplier_delivery_time).isValid() ?
					supplier_delivery_time : moment(common.getDate()).format(req.custom.config.date.format).toString();

				if (sup.supplier._id.toString() == req.custom.settings['site_id'] ) {
					req.body.delivery_time = supplier_delivery_time;
				} else if (!moment(req.body.delivery_time).isValid() && supplier_delivery_time && moment(supplier_delivery_time).isValid()) {
					req.body.delivery_time = supplier_delivery_time;
				}

				const cache = req.custom.cache;
				const day = moment(supplier_delivery_time).format('d');
				const hour = moment(supplier_delivery_time).format('H');
				const cache_key_dt = `delivery_times_${day}_${hour}`;
				const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0) + 1;
				const expired = 24;
				await cache.set(cache_key_dt, cached_delivery_times, expired);

				supplier_products_total += supplier_shipping_cost;
				sup.shipping_cost = supplier_shipping_cost;
				sup.total = common.getFixedPrice(supplier_products_total);
				sup.delivery_time = delivery_time;
			}


			const out_coupon = {
				code: general_coupon ? general_coupon.code : null,
				value: general_coupon ? common.getFixedPrice(general_coupon.percent_value ? (parseFloat(total_prods) * general_coupon.percent_value) / 100 : general_coupon.discount_value) : common.getFixedPrice(total_coupon_value),
				suppliers_coupons: productsGroupedBySupplier.filter(sup => sup.coupon).map(sup => sup.coupon)
			};

			/* const offer = await getAvailableOffer(req, total_prods, user.offer && user.offer.offer_id ? user.offer.offer_id : null);
			if (offer) {
				if (offer.product_sku) {
					const product_collection = req.custom.db.client().collection('product');
					const product = await product_collection.findOne({ sku: offer.product_sku });
					if (product) {
						offer.product = product;
						if (offer.type == 'product' && offer.isClaimed) {
							const jm3eiaProductIndex = productsGroupedBySupplier.findIndex(p => p.supplier._id == req.custom.settings['site_id']);
							if (jm3eiaProductIndex > -1) {
								productsGroupedBySupplier[jm3eiaProductIndex].products.push(product);
								products2save.push({
									...product, supplier: {
										_id: req.custom.settings['site_id'],
										name: {
											ar: req.custom.settings['site_name']['ar'],
											en: req.custom.settings['site_name']['en'],
										},
										min_delivery_time: req.custom.settings.orders.min_delivery_time,
										min_value: req.custom.settings.orders.min_value,
										delivery_time_text: ""
									}
								});
							} else {
								productsGroupedBySupplier.push({
									supplier: {
										_id: req.custom.settings['site_id'],
										name: {
											ar: req.custom.settings['site_name']['ar'],
											en: req.custom.settings['site_name']['en'],
										},
										min_delivery_time: req.custom.settings.orders.min_delivery_time,
										min_value: req.custom.settings.orders.min_value,
										delivery_time_text: ""
									},
									products: [product]
								});
							}
							products2save.push({
								...product, supplier: {
									_id: req.custom.settings['site_id'],
									name: {
										ar: req.custom.settings['site_name']['ar'],
										en: req.custom.settings['site_name']['en'],
									},
									min_delivery_time: req.custom.settings.orders.min_delivery_time,
									min_value: req.custom.settings.orders.min_value,
									delivery_time_text: ""
								}
							});
						}
					}
				}

			} */


			let total = parseFloat(total_prods) + parseFloat(shipping_cost) - parseFloat(general_coupon ? out_coupon.value : total_coupon_value);

			total = total > 0 ? total : 0;
			total = parseFloat(common.getFixedPrice(total));

			const wallet2money = user_wallet <= parseFloat(total) ? user_wallet : (user_info ? parseFloat(total) : 0);

			if (req.body.payment_method == 'wallet' && wallet2money < parseFloat(total)) {
				save_failed_payment(req, 'WALLET_NOT_ENOUGH');
				return res.out({
					message: req.custom.local.no_enough_wallet
				}, status_message.VALIDATION_ERROR);
			}

			let discount_by_wallet_value = 0;
			req.body.discount_by_wallet = ['TRUE', 'true', true].indexOf(req.body.discount_by_wallet) > -1 ? true : false;
			if (req.body.discount_by_wallet == true && wallet2money > 0 && wallet2money < total) {
				total -= parseFloat(wallet2money);
				discount_by_wallet_value = parseFloat(common.getFixedPrice(wallet2money));
			}

			let cart_total = total;
			if (req.body.payment_method == 'knet' && req.body.payment_details.amt) {
				cart_total = parseFloat(req.body.payment_details.amt);
			}

			if (coupons && coupons.length > 0) {
				for (let coupon of coupons) {
					await coupon_collection.updateOne({
						_id: ObjectID(coupon._id.toString())
					}, {
						$set: {
							number_of_uses: parseInt(coupon.number_of_uses || 0) + 1
						}
					}).catch(() => { });

					const coupon_token_collection = req.custom.db.client().collection('coupon_token');
					const coupon_token = await coupon_token_collection.findOne({ coupon: coupon.code, token: req.custom.token }).catch(() => null);
					coupon_token ? await coupon_token_collection.updateOne({
						_id: ObjectID(coupon_token._id.toString())
					}, {
						$set: { coupon: coupon.code, number_of_uses: parseInt(coupon_token.number_of_uses) + 1 }
					}).catch(() => null) : await coupon_token_collection.insertOne({
						token: req.custom.token,
						coupon: coupon.code,
						number_of_uses: 1
					});
				}
			}

			// Fix delivery time
			req.body.delivery_time = moment(req.body.delivery_time).isValid() ?
				req.body.delivery_time : moment(common.getDate()).format(req.custom.config.date.format).toString();

			const order_data = {
				order_id: (user_info ? 'u' : 'v') + '_' + shortid.generate(),
				payment_method: payment_method,
				payment_details: data.payment_details,
				subtotal: total_prods,
				cart_subtotal: total_prods,
				shipping_cost: shipping_cost,
				coupon: out_coupon,
				total: total,
				cart_total: cart_total,
				user_data: data.user_data,
				data: productsGroupedBySupplier.map((data) => {
					data.products = data.products.map(p => {
						delete p.variants;
						delete p.preparation_time;
						return p;
					});
					data.subtotal = common.getFixedPrice(data.subtotal);
					data.total = common.getFixedPrice(data.total);
					data.shipping_cost = common.getFixedPrice(data.shipping_cost);
					if (data.coupon && data.coupon.code)
						data.coupon.value = common.getFixedPrice(data.coupon.value);

					return data;
				}),
				products: products2save.map((p) => {
					delete p.variants;
					return p;
				}),
				hash: req.body.hash,
				delivery_time: common.getDate(req.body.delivery_time),
				discount_by_wallet: req.body.discount_by_wallet,
				discount_by_wallet_value: discount_by_wallet_value,
				store_id: ObjectID(req.custom.authorizationObject.store_id),
				notes: req.body.notes,
				created: common.getDate(),
				status: 1
			};

			console.log("delivery rime: ", order_data.delivery_time);

			const cache = req.custom.cache;
			const day = moment(req.body.delivery_time).format('d');
			const hour = moment(req.body.delivery_time).format('H');
			const cache_key_dt = `delivery_times_${day}_${hour}`;
			const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0) + 1;
			const expired = 24;
			await cache.set(cache_key_dt, cached_delivery_times, expired);

			const order_collection = req.custom.db.client().collection('order');
			await order_collection.insertOne(order_data)
				.catch((error) => {
					return {
						success: false,
						message: error.message
					}
				});


			if (data.user_data && data.user_data._id && (parseFloat(discount_by_wallet_value) > 0 || req.body.payment_method == 'wallet')) {
				const paid_wallet_value = parseFloat(req.body.payment_method == 'wallet' ? total : discount_by_wallet_value);
				const new_wallet = common.getFixedPrice(parseFloat(user_info.wallet) - parseFloat(paid_wallet_value));
				user_info.wallet = common.getFixedPrice(user_info.wallet);
				const wallet_data = {
					"member_id": ObjectID(data.user_data._id.toString()),
					"old_wallet": user_info.wallet,
					"new_wallet": new_wallet,
					"type": "deducted",
					"notes": `Buying by wallet from ${user_info.wallet} to ${new_wallet}`,
					"created": new Date(),
				};
				const wallet_history_collection = req.custom.db.client().collection('wallet_history');
				await wallet_history_collection.insertOne(wallet_data);

				const member_collection = req.custom.db.client().collection('member');
				await member_collection.updateOne({
					_id: ObjectID(data.user_data._id.toString())
				}, {
					$set: { wallet: new_wallet }
				}).catch(() => null)
			}

			const products2view = products2save.map((p) => {
				p.price = common.getFixedPrice(p.price);
				return p;
			});

			order_data.products = products2view;
			order_data.subtotal = common.getFixedPrice(order_data.subtotal);
			order_data.shipping_cost = common.getFixedPrice(order_data.shipping_cost);
			order_data.coupon.value = common.getFixedPrice(order_data.coupon.value);
			order_data.total = common.getFixedPrice(order_data.total);
			order_data.delivery_time = moment(req.body.delivery_time).format(req.custom.config.date.format).toString();

			const products_to_remove_from_cart = products2save.map(p => p.sku);
			if (user && user.cart) {
				for (const i of Object.keys(user.cart)) {
					if (products_to_remove_from_cart.includes(i)) {
						delete user.cart[i];
					}
				}
			}

			//req.custom.authorizationObject.cart = {};
			req.custom.authorizationObject.coupon = {
				code: null,
				value: 0,
			};

			//req.custom.authorizationObject.offer = {};

			await req.custom.cache.set(req.custom.token, req.custom.authorizationObject, req.custom.config.cache.life_time.token);

			// Copy to client
			if (data.user_data.email) {
				await mail.send_mail(req.custom.settings.sender_emails.orders, req.custom.settings.site_name[req.custom.lang], data.user_data.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);
			}

			// Copy to admin
			await mail.send_mail(req.custom.settings.sender_emails.orders, req.custom.settings.site_name[req.custom.lang], req.custom.settings.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

			const token = await get_remote_token(req);//.catch(() => null);

			//if (token) {
			// Update quantities
			await update_quantities(req, up_products, up_cart, token);//.catch(() => null);
			//}
			res.out(order_data);
		} catch (err) {
			console.log('err: ', err);
		}
	});

};

/**
 * Save unsuccessfully 
 * @param {Object} req
 * @param {Object} res
 */
module.exports.error = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	await save_failed_payment(req, 'UNEXPECTED_ERROR');

	res.out({
		message: req.custom.local.saved_done
	});

};

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
	const ObjectID = require("../../types/object_id");

	let user = req.custom.authorizationObject;
	const profile = require('../profile/controller');
	let user_info = await profile.getInfo(req, {
		_id: 1,
		fullname: 1,
		email: 1,
		mobile: 1,
		address: 1,
		addresses: 1,
		points: 1,
		wallet: 1,
		device_token: 1,
	}).catch(() => null);

	let data = {};
	if (user_info) {
		data.user_data = user_info;
		user_info.addresses = user_info.addresses || [];
		const address = user_info.addresses.find((i) => i.id == req.query.address_id);
		if (address) {
			data.user_data.address = address;
		}
		delete data.user_data.addresses;
	}

	let prods = [];
	if (user && user.cart) {
		for (const i of Object.keys(user.cart)) {
			prods.push(i.split('-')[0]);
		}
	}
	req.custom.clean_filter.sku = {
		'$in': prods
	};
	req.custom.limit = 0;
	mainController.list(req, res, 'product', {
		"_id": 1,
		"sku": 1,
		"soft_code": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"categories": "$prod_n_categoryArr",
		"picture": 1,
		"price": 1,
		"old_price": 1,
		"uom": 1,
		"barcode": 1,
		"weight": 1,
		"prod_n_storeArr": 1,
		"supplier_id": 1,
		"variants": 1,
		"preparation_time": 1,
		"free_shipping": 1,
		"discount_price_valid_until": 1
	}, async (out) => {
		try {
			if (out.data.length === 0) {
				return res.out({
					products: req.custom.local.cart_has_not_products
				}, status_message.NO_DATA);
			}

			let products = await products_to_save(out.data, user, req, true);
			let allProducts = [...products];

			console.log('suppliers to buy: ', req.query.suppliers);

			if (req.query.suppliers) {
				if (req.query.suppliers.length > 0) {
					const suppliers_to_buy = req.query.suppliers;
					products = products.filter(p => suppliers_to_buy.includes(p.supplier._id.toString()));
					/* allProducts = allProducts.map(p => {
						if (suppliers_to_buy.includes(p.supplier._id.toString()))
							p.isSelected = true;
						else
							p.isSelected = false;

						return p;
					}) */
				} else {
					return res.out({
						message: "No supplier selected"
					}, status_message.VALIDATION_ERROR);
				}
			}/*  else {
				allProducts = allProducts.map(p => {
					p.isSelected = true;
					return p;
				});
			} */

			const should_be_gifted = products.findIndex(p => p.categories.findIndex(c => FLOWERS_CATEGORIES_IDS.includes(c._id.toString())) > -1) > -1;

			let total_prods = parseFloat(products.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0) || 0);

			let purchase_possibility = req.custom.settings.orders && req.custom.settings.orders.min_value && parseInt(req.custom.settings.orders.min_value) > 0 && total_prods < parseInt(req.custom.settings.orders.min_value) ? false : true;

			let message = null;
			if (req.custom.settings.orders && req.custom.settings.orders.min_value && req.custom.settings.orders.min_value > total_prods) {
				message = req.custom.local.order_should_be_more_then({
					value: req.custom.settings.orders.min_value,
					currency: req.custom.authorizationObject.currency[req.custom.lang]
				});
			}

			const user_city_id = req.query.city_id || (user_info && data.user_data && data.user_data.address && data.user_data.address.city_id ?
				data.user_data.address.city_id.toString() :
				req.custom.authorizationObject.city_id.toString());
			const city_collection = req.custom.db.client().collection('city');
			const cityObj = await city_collection
				.findOne({
					_id: ObjectID(user_city_id)
				})
				.then((c) => c)
				.catch(() => null);
			const city_shipping_cost = parseFloat(cityObj.shipping_cost);
			let shipping_cost = 0;

			const productsGroupedBySupplier = groupBySupplier(allProducts, req.query.suppliers);
			const coupon_collection = req.custom.db.client().collection('coupon');
			const coupons = user.coupon && (user.coupon.code || user.coupon.suppliers_coupons) ? (await coupon_collection.find({
				code: user.coupon.code ? user.coupon.code : { $in: user.coupon.suppliers_coupons.map(c => c.code) },
				$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } },],
				status: true,
			}).toArray() || []) : null;

			const general_coupon = coupons ? coupons.find(c => !c.supplier_id && !c.only_for_jm3eia) : null;
			const suppliers_coupons = coupons ? coupons.filter(c => c.supplier_id || c.only_for_jm3eia).map(c => {
				if (c.only_for_jm3eia && !c.supplier_id) {
					c.supplier_id = req.custom.settings['site_id'];
				}
				return c;
			}) : [];

			let total_coupon_value = 0;

			for (let sup of productsGroupedBySupplier) {
				console.log("sup: ", sup.isSelected);
				let supplier_products_total = parseFloat(sup.products.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0) || 0);

				sup.subtotal = supplier_products_total;

				let supplier_shipping_cost = parseFloat(sup.supplier.shipping_cost) || city_shipping_cost;
				if (sup.supplier._id.toString() == req.custom.settings['site_id'] && sup.products.findIndex(p => p.free_shipping) > -1) {
					supplier_shipping_cost = 0;
				}

				if (sup.isSelected) {
					shipping_cost += supplier_shipping_cost;
				}

				const supplier_min_value = sup.supplier.min_value && parseInt(sup.supplier.min_value) > 0 ? parseInt(sup.supplier.min_value) : (req.custom.settings.orders.min_value ? parseInt(req.custom.settings.orders.min_value) : 0)
				sup.purchase_possibility = supplier_min_value > 0 && supplier_products_total < supplier_min_value ? false : true;
				if (purchase_possibility && !sup.purchase_possibility) {
					purchase_possibility = false;
				}

				if (!message) {
					if (sup.supplier.min_value && parseInt(sup.supplier.min_value) > supplier_products_total) {
						message = req.custom.local.order_should_be_more_then({
							value: sup.supplier.min_value,
							currency: req.custom.authorizationObject.currency[req.custom.lang]
						});
					}

				}

				if (!general_coupon && suppliers_coupons && suppliers_coupons.length > 0) {
					const supplier_coupon = suppliers_coupons.find(c => c.supplier_id.toString() == sup.supplier._id.toString());
					if (supplier_coupon) {
						let totalWithNoDiscount = 0;
						sup.products.map(i => {
							if (!i.old_price || i.old_price <= 0) {
								totalWithNoDiscount += i.price * i.quantity;
							}
						});

						const totalToApplyCoupon = supplier_coupon.apply_on_discounted_products ? parseFloat(supplier_products_total) : totalWithNoDiscount;

						sup.coupon = {
							code: supplier_coupon.code,
							value: common.getFixedPrice(supplier_coupon.percent_value ? (totalToApplyCoupon * supplier_coupon.percent_value) / 100 : supplier_coupon.discount_value)
						}
						if (supplier_products_total > parseFloat(sup.coupon.value || 0)) {
							supplier_products_total -= parseFloat(sup.coupon.value || 0);
							if (sup.isSelected)
								total_coupon_value += parseFloat(sup.coupon.value || 0);
						}
					}
				}

				let delivery_times = [];
				let min_delivery_time_setting = 30;
				if (parseInt(req.custom.settings.orders.min_delivery_time) > 0) {
					min_delivery_time_setting = parseInt(req.custom.settings.orders.min_delivery_time);
				}

				if (sup.supplier.is_external && sup.supplier.min_delivery_time && parseInt(sup.supplier.min_delivery_time) > 0) {
					min_delivery_time_setting = parseInt(sup.supplier.min_delivery_time);
				}

				const cache = req.custom.cache;
				let times = [];
				moment.updateLocale('en', {});
				const min_delivery_time = getRoundedDate(60, new Date(moment().add(min_delivery_time_setting, 'minutes').format(req.custom.config.date.format).toString()));
				const min_hour = parseInt(moment(min_delivery_time).format('H'));
				let today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
				let available_delivery_times = req.custom.settings.orders.available_delivery_times[today.format('d')];
				if (cityObj && cityObj.enable_custom_delivery_times) {
					available_delivery_times = mergeDeliveryTimes(available_delivery_times, cityObj.available_delivery_times[today.format('d')]);
				}

				if (sup.supplier.is_external && sup.supplier.available_delivery_times) {
					available_delivery_times = mergeDeliveryTimes(available_delivery_times, sup.supplier.available_delivery_times[today.format('d')]);
				}

				if (available_delivery_times) {
					const day = moment().format('d');
					const min_day = moment(min_delivery_time);
					for (let idx = min_hour; idx < available_delivery_times.length; idx++) {
						today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
						if (!available_delivery_times[idx] ||
							!available_delivery_times[idx].is_available ||
							!available_delivery_times[idx].max_orders ||
							min_day.format('d') != moment().format('d') ||
							(idx < min_hour)
						) {
							continue;
						}
						moment.updateLocale('en', {});
						const full_date = today.add(idx, 'hours').format(req.custom.config.date.format);
						const time = today.format('LT') + ' : ' + today.add(2, 'hours').format('LT');

						const cache_key_dt = `delivery_times_${day}_${idx}`;
						const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);

						if (available_delivery_times[idx].max_orders > cached_delivery_times) {
							times.push({
								'time': time,
								'full_date': full_date,
								'is_available': true,
								'text': req.custom.local.delivery_time_available,
							});
						}

					}
				}
				moment.updateLocale(req.custom.lang, {});
				today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
				delivery_times.push({
					'day': today.format('dddd'),
					'times': times
				});

				times = [];
				moment.updateLocale('en', {});
				let tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
				let tomorrow_available_delivery_times = req.custom.settings.orders.available_delivery_times[tomorrow.format('d')];
				if (cityObj && cityObj.enable_custom_delivery_times) {
					tomorrow_available_delivery_times = mergeDeliveryTimes(tomorrow_available_delivery_times, cityObj.available_delivery_times[tomorrow.format('d')])
				}
				//
				if (sup.supplier.is_external && sup.supplier.available_delivery_times) {
					tomorrow_available_delivery_times = mergeDeliveryTimes(tomorrow_available_delivery_times, sup.supplier.available_delivery_times[today.format('d')]);

				}
				if (tomorrow_available_delivery_times) {
					const day = tomorrow.format('d');

					for (let idx = 0; idx < tomorrow_available_delivery_times.length; idx++) {
						tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
						if (!tomorrow_available_delivery_times[idx] ||
							!tomorrow_available_delivery_times[idx].is_available ||
							!tomorrow_available_delivery_times[idx].max_orders
						) {
							continue;
						}
						moment.updateLocale('en', {});
						const full_date = tomorrow.add(idx, 'hours').format(req.custom.config.date.format);
						const time = tomorrow.format('LT') + ' : ' + tomorrow.add(2, 'hours').format('LT');

						const cache_key_dt = `delivery_times_${day}_${idx}`;
						const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);
						if (tomorrow_available_delivery_times && tomorrow_available_delivery_times[idx] && tomorrow_available_delivery_times[idx].max_orders > cached_delivery_times) {
							times.push({
								'time': time,
								'full_date': full_date,
								'is_available': true,
								'text': req.custom.local.delivery_time_available,
							});
						}

					}
				}

				moment.updateLocale(req.custom.lang, {});
				tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
				delivery_times.push({
					'day': tomorrow.format('dddd'),
					'times': times
				});

				let earliest_date_of_delivery = parseInt(cityObj.preparation_time || 0);
				for (const p of products) {
					let preparation_time_for_product = parseInt(p.preparation_time || 0) + ((p.quantity - 1) * parseInt((p.preparation_time || 0) / 2));
					earliest_date_of_delivery += preparation_time_for_product / 60;
				}

				if (cityObj.enable_immediate_delivery === false || req.custom.settings.orders.enable_immediate_delivery === false) {
					earliest_date_of_delivery = 0;
					// earliest_date_of_delivery = null;
				} else if (sup.supplier.is_external && sup.supplier.min_delivery_time) {
					earliest_date_of_delivery += parseInt(sup.supplier.min_delivery_time || 0);
				} else {
					earliest_date_of_delivery += parseInt(req.custom.settings.orders.min_delivery_time || 0);
					// earliest_date_of_delivery = common.getDate(moment().add(earliest_date_of_delivery, 'minutes'));
				}

				moment.updateLocale('en', {});
				const dayOfWeek = moment().format('d');
				if (sup.supplier.working_times && sup.supplier.working_times.length > 0 && dayOfWeek <= sup.supplier.working_times.length) {
					const dayHours = common.getDate().getHours();
					console.log('this is being triggered: ', dayOfWeek, dayHours, sup.supplier.working_times[dayOfWeek]);
					const isOpen = sup.supplier.working_times[dayOfWeek].from <= dayHours && sup.supplier.working_times[dayOfWeek].to >= dayHours;
					sup.supplier.isOpen = isOpen;
				} else {
					sup.supplier.isOpen = true;
				}

				earliest_date_of_delivery = earliest_date_of_delivery ? earliest_date_of_delivery + 10 : 0;
				sup.earliest_date_of_delivery = earliest_date_of_delivery;
				sup.delivery_times = delivery_times;
				supplier_products_total += supplier_shipping_cost;
				sup.shipping_cost = supplier_shipping_cost;
				sup.total = common.getFixedPrice(supplier_products_total);
				sup.gift_note = sup.products.findIndex(p => p.categories.findIndex(c => FLOWERS_CATEGORIES_IDS.includes(c._id.toString())) > -1) > -1;
			}

			let totalWithNoDiscount = 0;
			products.map(i => {
				if (!i.old_price || i.old_price <= 0) {
					totalWithNoDiscount += i.price * i.quantity;
				}
			});

			const totalToApplyCoupon = general_coupon ? (general_coupon.apply_on_discounted_products ? parseFloat(total_prods) : totalWithNoDiscount) : 0;

			const out_coupon = {
				code: general_coupon ? general_coupon.code : null,
				value: general_coupon ? common.getFixedPrice(general_coupon.percent_value ? (totalToApplyCoupon * general_coupon.percent_value) / 100 : general_coupon.discount_value) : common.getFixedPrice(total_coupon_value),
				suppliers_coupons: productsGroupedBySupplier.filter(sup => sup.coupon).map(sup => sup.coupon)
			};
			/* const offer = await getAvailableOffer(req, total_prods, user.offer && user.offer.offer_id ? user.offer.offer_id : null);
			if (offer) {
				if (offer.product_sku) {
					const product_collection = req.custom.db.client().collection('product');
					const product = await product_collection.findOne({ sku: offer.product_sku });
					if (product) {
						offer.product = product;
						if (offer.type == 'product' && offer.isClaimed) {
							const jm3eiaProductIndex = productsGroupedBySupplier.findIndex(p => p.supplier._id == req.custom.settings['site_id']);
							if (jm3eiaProductIndex > -1) {
								productsGroupedBySupplier[jm3eiaProductIndex].products.push(product);
							} else {
								productsGroupedBySupplier.push({
									supplier: {
										_id: req.custom.settings['site_id'],
										name: {
											ar: req.custom.settings['site_name']['ar'],
											en: req.custom.settings['site_name']['en'],
										},
										min_delivery_time: req.custom.settings.orders.min_delivery_time,
										min_value: req.custom.settings.orders.min_value,
										delivery_time_text: ""
									},
									products: [product]
								});
							}
							products.push({
								...product, supplier: {
									_id: req.custom.settings['site_id'],
									name: {
										ar: req.custom.settings['site_name']['ar'],
										en: req.custom.settings['site_name']['en'],
									},
									min_delivery_time: req.custom.settings.orders.min_delivery_time,
									min_value: req.custom.settings.orders.min_value,
									delivery_time_text: ""
								}
							})
						}
					}
				}

			} */

			let total = parseFloat(total_prods) + parseFloat(shipping_cost);
			if (general_coupon && parseFloat(total_prods) > out_coupon.value) {
				total -= parseFloat(general_coupon ? out_coupon.value : total_coupon_value);
			}
			total = total > 0 ? total : 0;

			const user_collection = req.custom.db.client().collection('member');
			const userObj = req.custom.authorizationObject.member_id ? await user_collection
				.findOne({
					_id: ObjectID(req.custom.authorizationObject.member_id.toString())
				})
				.then((c) => c)
				.catch(() => null) : null;

			const user_wallet = userObj ? parseFloat(total > userObj.wallet ? userObj.wallet : parseFloat(total)) : 0;

			const wallet2money = user_wallet <= parseFloat(total) ? user_wallet : (user_wallet ? parseFloat(total) : 0);

			const can_pay_by_wallet = user_wallet >= parseFloat(total) ? true : false;

			const payment_methods = enums_payment_methods(req).
				filter(payment_method => {
					const disabled_payment_methods = process.env.ORDER_DISABLED_PAYMENT_METHODS ? process.env.ORDER_DISABLED_PAYMENT_METHODS.split(',') : [];
					if (disabled_payment_methods.indexOf(payment_method.id) > -1) {
						return false;
					}
					const allow_payment_methods = req.custom.settings.orders.allow;
					const platform = req.headers.platform;
					const user_visitor = req.custom.authorizationObject.member_id ? 'registered' : 'visitors';
					const method_key = `${payment_method.id}_for_${user_visitor}_on_${platform}`;
					if (allow_payment_methods && allow_payment_methods[method_key] === false) {
						return false;
					}
					if (payment_method.valid == true && total > 0) {
						return true;
					} else if (payment_method.id == 'wallet' && can_pay_by_wallet) {
						return true;
					} else if (['cod'].indexOf(payment_method.id) > -1) {
						return true;
					}
					return false;
				});
			console.log('payment methods: ', payment_methods);


			let delivery_times = [];

			let min_delivery_time_setting = 30;
			if (parseInt(req.custom.settings.orders.min_delivery_time) > 0) {
				min_delivery_time_setting = parseInt(req.custom.settings.orders.min_delivery_time);
			}

			const cache = req.custom.cache;
			let times = [];
			moment.updateLocale('en', {});
			const min_delivery_time = getRoundedDate(60, new Date(moment().add(min_delivery_time_setting, 'minutes').format(req.custom.config.date.format).toString()));
			const min_hour = parseInt(moment(min_delivery_time).format('H'));
			let today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
			let available_delivery_times = req.custom.settings.orders.available_delivery_times[today.format('d')];

			if (cityObj && cityObj.enable_custom_delivery_times) {
				available_delivery_times = mergeDeliveryTimes(available_delivery_times, cityObj.available_delivery_times[today.format('d')])
			}
			if (available_delivery_times) {
				const day = moment().format('d');
				const min_day = moment(min_delivery_time);
				for (let idx = min_hour; idx < available_delivery_times.length; idx++) {
					today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
					if (!available_delivery_times[idx] ||
						!available_delivery_times[idx].is_available ||
						!available_delivery_times[idx].max_orders ||
						min_day.format('d') != moment().format('d') ||
						(idx < min_hour)
					) {
						continue;
					}
					moment.updateLocale('en', {});
					const full_date = today.add(idx, 'hours').format(req.custom.config.date.format);
					const time = today.format('LT') + ' : ' + today.add(2, 'hours').format('LT');

					const cache_key_dt = `delivery_times_${day}_${idx}`;
					const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);

					if (available_delivery_times[idx].max_orders > cached_delivery_times) {
						times.push({
							'time': time,
							'full_date': full_date,
							'is_available': true,
							'text': req.custom.local.delivery_time_available,
						});
					}

				}
			}
			moment.updateLocale(req.custom.lang, {});
			today = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
			delivery_times.push({
				'day': today.format('dddd'),
				'times': times
			});

			times = [];
			moment.updateLocale('en', {});
			let tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
			let tomorrow_available_delivery_times = req.custom.settings.orders.available_delivery_times[tomorrow.format('d')];
			if (cityObj && cityObj.enable_custom_delivery_times) {
				tomorrow_available_delivery_times = mergeDeliveryTimes(tomorrow_available_delivery_times, cityObj.available_delivery_times[tomorrow.format('d')])
			}
			if (tomorrow_available_delivery_times) {
				const day = tomorrow.format('d');

				for (let idx = 0; idx < tomorrow_available_delivery_times.length; idx++) {
					tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
					if (!tomorrow_available_delivery_times[idx] ||
						!tomorrow_available_delivery_times[idx].is_available ||
						!tomorrow_available_delivery_times[idx].max_orders
					) {
						continue;
					}
					moment.updateLocale('en', {});
					const full_date = tomorrow.add(idx, 'hours').format(req.custom.config.date.format);
					const time = tomorrow.format('LT') + ' : ' + tomorrow.add(2, 'hours').format('LT');

					const cache_key_dt = `delivery_times_${day}_${idx}`;
					const cached_delivery_times = parseInt(await cache.get(cache_key_dt).catch(() => null) || 0);
					if (tomorrow_available_delivery_times && tomorrow_available_delivery_times[idx] && tomorrow_available_delivery_times[idx].max_orders > cached_delivery_times) {
						times.push({
							'time': time,
							'full_date': full_date,
							'is_available': true,
							'text': req.custom.local.delivery_time_available,
						});
					}

				}
			}

			moment.updateLocale(req.custom.lang, {});
			tomorrow = moment().add(1, 'day').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
			delivery_times.push({
				'day': tomorrow.format('dddd'),
				'times': times
			});

			let addresses = [];
			if (userObj) {
				const base_address = userObj.address || {};
				base_address.id = 'primary';
				base_address.name = req.custom.local.default_address;
				addresses = [base_address, ...userObj.addresses || []];
			}

			let earliest_date_of_delivery = parseInt(cityObj.preparation_time || 0);
			for (const p of products) {
				let preparation_time_for_product = parseInt(p.preparation_time || 0) + ((p.quantity - 1) * parseInt((p.preparation_time || 0) / 2));
				earliest_date_of_delivery += preparation_time_for_product / 60;
			}

			if (cityObj.enable_immediate_delivery === false || req.custom.settings.orders.enable_immediate_delivery === false) {
				earliest_date_of_delivery = 0;
				// earliest_date_of_delivery = null;
			} else {
				earliest_date_of_delivery += parseInt(req.custom.settings.orders.min_delivery_time || 0);
				// earliest_date_of_delivery = common.getDate(moment().add(earliest_date_of_delivery, 'minutes'));
			}

			earliest_date_of_delivery = earliest_date_of_delivery ? earliest_date_of_delivery + 10 : 0;

			res.out({
				subtotal: common.getFixedPrice(total_prods),
				shipping_cost: common.getFixedPrice(shipping_cost),
				coupon: out_coupon,
				discount_by_wallet: common.getFixedPrice(user_wallet),
				discount_by_wallet_value: common.getFixedPrice(wallet2money || 0),
				total: common.getFixedPrice(total),
				purchase_possibility: productsGroupedBySupplier.length > 1 ? true : purchase_possibility,
				message: productsGroupedBySupplier.length > 1 ? null : message,
				addresses: addresses,
				gift_note: should_be_gifted,
				payment_methods: productsGroupedBySupplier.find(s => s.isSelected && s.supplier.allow_cod === false) ? payment_methods.filter(p => p.id !== 'cod') : payment_methods,
				earliest_date_of_delivery: earliest_date_of_delivery,
				delivery_times: delivery_times,
				//offer: offer,
				data: productsGroupedBySupplier.map((data) => {
					data.payment_methods = data.supplier.allow_cod === false ? payment_methods.filter(p => p.id !== 'cod') : payment_methods;
					data.products = data.products.map(p => {
						delete p.variants;
						delete p.preparation_time;
						return p;
					});
					return data;
				}),
				products: products.map((p) => {
					delete p.variants;
					delete p.preparation_time;
					return p;
				}),

			});
		} catch (err) {
			console.log('er: ', err);
		}
	});
};

async function products_to_save(products, user, req, to_display = false) {

	let products_arr = [];
	for (const p of products) {
		if (p.variants && p.variants.length > 0) {
			for (const v of p.variants) {
				if (Object.keys(user.cart).indexOf(v.sku) > -1) {
					products_arr.push({
						_id: ObjectID(p._id),
						sku: v.sku,
						soft_code: v.soft_code,
						barcode: v.barcode,
						price: parseFloat(v.price || p.price),
						name: p.name,
						variants_options: v.options.map((v_o) => {
							return {
								label: v_o.name[req.custom.lang] || v_o.name[req.custom.config.local],
								name: v_o.name[req.custom.lang] || v_o.name[req.custom.config.local],
								sku_code: v_o.sku_code,
								value: v_o.value,
								type: v_o.type,
							};
						}),
						categories: p.categories,
						picture: v.gallery_pictures && v.gallery_pictures[0] ? req.custom.config.media_url + v.gallery_pictures[0] : p.picture,
						uom: p.uom,
						weight: p.weight,
						preparation_time: parseInt(p.preparation_time || 30),
						prod_n_storeArr: v.prod_n_storeArr,
						supplier_id: p.supplier_id,
					});
				}
			}
		} else if (Object.keys(user.cart).indexOf(p.sku) > -1) {
			p.variants_options = null;
			p.preparation_time = parseInt(p.preparation_time || 30);
			products_arr.push(p);
		}
	}

	let all_categories = [];
	await (async () => {
		const cache = req.custom.cache;
		const cache_key = `category_all_solid`;
		all_categories = await cache.get(cache_key).catch(() => null);
		if (!all_categories) {
			const category_collection = req.custom.db.client().collection('category');
			all_categories = await category_collection.find({
				status: true
			})
				.toArray() || [];
			if (all_categories) {
				cache.set(cache_key, all_categories, req.custom.config.cache.life_time).catch(() => null);
			}
		}
	})();

	let all_suppliers = [];
	await (async () => {

		const cache = req.custom.cache;
		const cache_key = `supplier_all_solid`;
		all_suppliers = false;//await cache.get(cache_key).catch(() => null);
		if (!all_suppliers) {
			const supplier_collection = req.custom.db.client().collection('supplier');
			all_suppliers = await supplier_collection.find({}).toArray() || [];
			if (all_suppliers) {
				cache.set(cache_key, all_suppliers, req.custom.config.cache.life_time).catch(() => null);
			}
		}

	})();

	const out_data = products_arr.map((prod) => {

		prod.quantity = user.cart[prod.sku.toString()];
		if (prod.prod_n_storeArr) {
			for (const store of prod.prod_n_storeArr) {
				if (store.feed_from_store_id) {
					const temp_store = prod.prod_n_storeArr.find((i) => i.store_id.toString() == store.feed_from_store_id.toString());
					store.quantity = temp_store.quantity;
				}
				if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
					prod.cart_quantity = prod.quantity;
					if (store.status == false || store.quantity <= 0) {
						prod.quantity = 0;
						prod.warning = req.custom.local.cart_product_unavailable;
					} else if (store.quantity < prod.quantity) {
						prod.quantity = store.quantity;
						prod.warning = req.custom.local.cart_product_exceeded_allowed_updated;
					}
					break;
				}
			}
		}

		delete prod.prod_n_storeArr;
		if (prod.categories) {
			prod.categories = prod.categories.map((i) => {
				const cat_obj = all_categories.find((c) => c._id.toString() == i.category_id.toString());
				if (cat_obj) {
					const y = {};
					y._id = cat_obj._id;
					y.name = cat_obj.name;
					if (y._id && y.name) {
						return y;
					}
				}
			});
			prod.categories = prod.categories.filter((i) => i != null);
		} else {
			prod.categories = [];
		}

		prod.supplier_id = prod.supplier_id || req.custom.settings['site_id'];
		const supplier = all_suppliers.find((s) => prod.supplier_id && s._id.toString() == prod.supplier_id.toString());
		prod.supplier = supplier ? {
			_id: supplier._id,
			name: {
				ar: supplier.name['ar'],
				en: supplier.name['en'],
			},
			shipping_cost: supplier.shipping_cost || 0,
			min_delivery_time: supplier.delivery_time,
			min_value: supplier.min_order,
			allow_cod: supplier.allow_cod,
			delivery_time_text: supplier.delivery_time_text,
			working_times: supplier.is_external ? moment.weekdays().map((i, idx) => ({ ...supplier.working_times[idx], text: i })) : undefined
		} : to_display ? {
			_id: req.custom.settings['site_id'],
			name: {
				ar: req.custom.settings['site_name']['ar'],
				en: req.custom.settings['site_name']['en'],
			},
			min_delivery_time: req.custom.settings.orders.min_delivery_time,
			min_value: req.custom.settings.orders.min_value,
			delivery_time_text: ""
		} : null;
		prod.delivery_time = supplier ? supplier.delivery_time : req.body.delivery_time;

		return prod;
	});

	return out_data;
}

function save_failed_payment(req, reason = null) {
	const failed_payment_collection = req.custom.db.client().collection('failed_payment');
	req.body.reason = reason;
	const data = req.body;
	data.created = common.getDate();
	failed_payment_collection.insertOne(data)
		.catch((error) => {
			return {
				success: false,
				message: error.message
			}
		});
}

function getRoundedDate(minutes, d = null) {
	if (!d) {
		d = common.getDate();
	}

	const rended_minutes = d.getMinutes() + 30;
	d.setMinutes(rended_minutes);

	let ms = 1000 * 60 * minutes; // convert minutes to ms
	return new Date(Math.round(d.getTime() / ms) * ms);
}

function update_quantities(req, the_products, cart, token) {
	const collection = req.custom.db.client().collection('product');
	let promises = [];

	for (const p_n_c of Object.keys(cart)) {

		const p = the_products.find((my_prod) => p_n_c.includes(my_prod.sku))

		const quantity = parseInt(cart[p_n_c]);
		let store_id = req.custom.authorizationObject.store_id.toString();

		const remote_product = {
			store_id: store_id,
			quantity: 0,
			soft_code: p_n_c,
		};

		if (p_n_c.includes('-')) {

			let variant = p.variants.find((i) => i.sku == p_n_c);
			let prod_n_storeArr = [];
			if (variant.prod_n_storeArr) {
				for (const i of variant.prod_n_storeArr) {
					if (i.store_id.toString() == store_id) {
						i.quantity -= quantity;
						i.quantity = i.quantity >= 0 ? i.quantity : 0
					}
					i.store_id = ObjectID(i.store_id.toString());
					prod_n_storeArr.push(i);
				}
			}
			let variants = p.variants.map((v) => {
				if (v.sku == p_n_c) {
					return variant;
				}
				return v;
			});

			let parent_prod_n_storeArr = [];
			for (const i of p.prod_n_storeArr) {
				if (i.feed_from_store_id) {
					const temp_store = p.prod_n_storeArr.find((pi) => pi.store_id.toString() == i.feed_from_store_id.toString());
					i.quantity = temp_store.quantity;
					p.prod_n_storeArr = p.prod_n_storeArr.map((pi) => {
						if (pi.store_id.toString() == temp_store.store_id.toString()) {
							pi.quantity -= quantity;
							pi.quantity = pi.quantity >= 0 ? pi.quantity : 0;
						}
						return pi;
					});
				} else if (i.store_id.toString() == store_id) {
					i.quantity -= quantity;
					i.quantity = i.quantity >= 0 ? i.quantity : 0
				}
				i.store_id = ObjectID(i.store_id.toString());
				parent_prod_n_storeArr.push(i);
			}

			const update = collection.updateOne({
				_id: ObjectID(p._id.toString())
			}, {
				$set: { variants: variants, prod_n_storeArr: parent_prod_n_storeArr }
			}).catch(() => null);
			promises.push(update);

		} else {
			let prod_n_storeArr = [];
			if (p.prod_n_storeArr) {
				for (const i of p.prod_n_storeArr) {
					if (i.feed_from_store_id) {
						const temp_store = p.prod_n_storeArr.find((pi) => pi.store_id.toString() == i.feed_from_store_id.toString());
						i.quantity = temp_store.quantity;
						p.prod_n_storeArr = p.prod_n_storeArr.map((pi) => {
							if (pi.store_id.toString() == temp_store.store_id.toString()) {
								pi.quantity -= quantity;
								pi.quantity = pi.quantity >= 0 ? pi.quantity : 0;
							}
							return pi;
						});
					} else if (i.store_id.toString() == store_id) {
						i.quantity -= quantity;
						i.quantity = i.quantity >= 0 ? i.quantity : 0
					}
					i.store_id = ObjectID(i.store_id.toString());
					prod_n_storeArr.push(i);
				}
			}
			const update = collection.updateOne({
				_id: ObjectID(p._id.toString())
			}, {
				$set: { prod_n_storeArr: prod_n_storeArr }
			}).catch(() => null);
			promises.push(update);
			remote_product.quantity = quantity;
			if (token) {
				promises.push(update_remote_quantity(req, remote_product, token));
			}
		}

	}

	return Promise.all(promises);
}

function get_remote_token(req) {
	if (
		!req.custom.config.desktop.app_id ||
		!req.custom.config.desktop.app_secret ||
		!req.custom.config.desktop.email ||
		!req.custom.config.desktop.password
	) {
		return false;
	}
	var data = JSON.stringify({
		"appId": req.custom.config.desktop.app_id,
		"appSecret": req.custom.config.desktop.app_secret,
		"email": req.custom.config.desktop.email,
		"password": req.custom.config.desktop.password,
	});

	var config = {
		method: 'post',
		url: `${req.custom.config.desktop.base_url}/auth/login`,
		headers: {
			'Content-Type': 'application/json',
			'Language': 'ar'
		},
		data: data
	};

	return axios(config)
		.then(function (response) {
			return response.data && response.data.results && response.data.results.token;
		})
		.catch(function (error) {
			console.log(error);
		});

}

function update_remote_quantity(req, p, token) {
	var data = JSON.stringify({
		"store_id": p.store_id,
		"quantity": p.quantity
	});

	var config = {
		method: 'put',
		url: `${req.custom.config.desktop.base_url}/product/${p.soft_code}/decrease_quantity`,
		headers: {
			'Accept': 'application/json',
			'Language': 'en',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: data
	};

	return axios(config)
		.catch(function (error) {
			console.log(error);
		});
}
