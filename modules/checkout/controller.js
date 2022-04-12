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
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');



/**
 * Buy product in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.buy = async function (req, res) {
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
	const up_cart = user.cart;
	req.custom.limit = 0;
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
	}, async (out) => {
		if (out.data.length === 0) {
			save_failed_payment(req, 'NO_PRODUCTS_IN_CART');
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, status_message.NO_DATA);
		}

		const up_products = JSON.parse(JSON.stringify(out.data));

		const products2save = await products_to_save(out.data, user, req);

		const payment_method = enums_payment_methods(req).find((pm) => pm.id == data.payment_method);

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
		const shipping_cost = parseFloat(cityObj.shipping_cost);
		data.user_data.address.city_name = cityObj.name[req.custom.lang];

		const coupon_collection = req.custom.db.client().collection('coupon');
		const coupon = user.coupon ? await coupon_collection.findOne({
			code: user.coupon.code,
			$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } }],
			status: true,
		}).then((coupon) => coupon).catch(() => null) : null;

		const out_coupon = {
			code: coupon ? coupon.code : null,
			value: coupon ? parseFloat(common.getFixedPrice(coupon.percent_value ? (total_prods * coupon.percent_value) / 100 : coupon.discount_value)) : 0
		};

		let total = total_prods + shipping_cost - out_coupon.value;
		total = total > 0 ? total : 0;
		total = parseFloat(common.getRoundedPrice(total));

		const user_wallet = user_info ? user_info.wallet : 0;
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

		if (coupon) {
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
		order_data.subtotal = common.getRoundedPrice(order_data.subtotal);
		order_data.shipping_cost = common.getFixedPrice(order_data.shipping_cost);
		order_data.coupon.value = common.getFixedPrice(order_data.coupon.value);
		order_data.total = common.getRoundedPrice(order_data.total);
		order_data.delivery_time = moment(req.body.delivery_time).format(req.custom.config.date.format).toString();

		req.custom.authorizationObject.cart = {};
		req.custom.authorizationObject.coupon = {
			code: null,
			value: 0,
		};
		await req.custom.cache.set(req.custom.token, req.custom.authorizationObject, req.custom.config.cache.life_time.token);

		// Copy to client
		if (data.user_data.email) {
			await mail.send_mail(req.custom.settings.sender_emails.orders, req.custom.settings.site_name[req.custom.lang], data.user_data.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);
		}

		// Copy to admin
		await mail.send_mail(req.custom.settings.sender_emails.orders, req.custom.settings.site_name[req.custom.lang], req.custom.settings.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

		const token = await get_remote_token(req).catch(() => null);

		if (token) {
			// Update quantities
			await update_quantities(req, up_products, up_cart, token).catch(() => null);
		}

		res.out(order_data);
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
		"uom": 1,
		"barcode": 1,
		"weight": 1,
		"prod_n_storeArr": 1,
		"supplier_id": 1,
		"variants": 1,
		"preparation_time": 1,
	}, async (out) => {
		if (out.data.length === 0) {
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, status_message.NO_DATA);
		}

		const products = await products_to_save(out.data, user, req, true);

		const total_prods = parseFloat(products.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0) || 0);

		const user_city_id = user_info && data.user_data && data.user_data.address && data.user_data.address.city_id ?
			data.user_data.address.city_id.toString() :
			req.custom.authorizationObject.city_id.toString();
		const city_collection = req.custom.db.client().collection('city');
		const cityObj = await city_collection
			.findOne({
				_id: ObjectID(user_city_id)
			})
			.then((c) => c)
			.catch(() => null);
		const shipping_cost = parseFloat(cityObj.shipping_cost);

		const coupon_collection = req.custom.db.client().collection('coupon');
		const coupon = user.coupon ? await coupon_collection.findOne({
			code: user.coupon.code,
			$or: [{ valid_until: null }, { valid_until: { $gt: new Date() } }],
			status: true,
		}).then((coupon) => coupon).catch(() => null) : null;

		const out_coupon = {
			code: coupon ? coupon.code : null,
			value: coupon ? common.getFixedPrice(coupon.percent_value ? (parseFloat(total_prods) * coupon.percent_value) / 100 : coupon.discount_value) : 0
		};

		let total = parseFloat(total_prods) + parseFloat(shipping_cost) - parseFloat(out_coupon.value);
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

		let payment_methods = enums_payment_methods(req).
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
		const available_delivery_times = req.custom.settings.orders.available_delivery_times[today.format('d')];
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
		const tomorrow_available_delivery_times = req.custom.settings.orders.available_delivery_times[tomorrow.format('d')];
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

		const purchase_possibility = req.custom.settings.orders && req.custom.settings.orders.min_value && parseInt(req.custom.settings.orders.min_value) > 0 && total_prods < parseInt(req.custom.settings.orders.min_value) ? false : true;

		let message = null;
		if (req.custom.settings.orders && req.custom.settings.orders.min_value && req.custom.settings.orders.min_value > total_prods) {
			message = req.custom.local.order_should_be_more_then({
				value: req.custom.settings.orders.min_value,
				currency: req.custom.authorizationObject.currency[req.custom.lang]
			});
		}

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
			subtotal: common.getRoundedPrice(total_prods),
			shipping_cost: common.getFixedPrice(shipping_cost),
			coupon: out_coupon,
			discount_by_wallet: common.getRoundedPrice(user_wallet),
			discount_by_wallet_value: common.getRoundedPrice(wallet2money || 0),
			total: common.getRoundedPrice(total),
			purchase_possibility: purchase_possibility,
			message: message,
			addresses: addresses,
			payment_methods: payment_methods,
			earliest_date_of_delivery: earliest_date_of_delivery,
			delivery_times: delivery_times,
			products: products.map((p) => {
				delete p.variants;
				delete p.preparation_time;
				return p;
			}),
		});
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
		all_suppliers = await cache.get(cache_key).catch(() => null);
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

		prod.supplier_id = prod.supplier_id || req.custom.settings['site_name']['en'];
		const supplier = all_suppliers.find((s) => prod.supplier_id && s._id.toString() == prod.supplier_id.toString());
		prod.supplier = supplier ? {
			_id: supplier._id,
			name: {
				ar: supplier.name['ar'],
				en: supplier.name['en'],
			}
		} : to_display ? {
			_id: req.custom.settings['site_name']['en'],
			name: {
				ar: req.custom.settings['site_name']['ar'],
				en: req.custom.settings['site_name']['en'],
			}
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
			})
			const update = collection.updateOne({
				_id: ObjectID(p._id.toString())
			}, {
				$set: { variants: variants }
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
			promises.push(update_remote_quantity(req, remote_product, token));
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