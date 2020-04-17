// Checkout Controller
const ObjectID = require("@big_store_core/base/types/object_id");
const uuid = require('uuid');
const common = require('@big_store_core/base/libraries/common');
const mainController = require("../../libraries/mainController");
const mail = require('@big_store_core/base/libraries/mail');
const mail_view = require("./view/mail");
const moment = require('moment');
const enums_payment_methods = require('@big_store_core/base/enums/payment_methods');
const shortid = require('shortid');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');


let total_prods = 0;

/**
 * Buy product in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.buy = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

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
	}).catch(() => null);

	if (user_info) {
		req.body.user_data = user_info;
	}

	let hash = uuid().replace(/-/g, '');

	if (only_validation && !req.body.hash) {
		req.body.hash = hash;

		req.custom.authorizationObject.hash = hash;
		await req.custom.cache.set(req.custom.token, req.custom.authorizationObject);

	}

	req.custom.model = require(`./model/buy_${user_info ? 'user' : 'visitor'}`);
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
		const address = user_info.addresses.find((i) => i.name == data.address_name);
		if (address) {
			data.user_data.address = address;
		}
		delete data.user_data.addresses;
	}

	if (!data.hash || req.custom.authorizationObject.hash != data.hash) {
		save_failed_payment(req);
		return res.out({
			message: req.custom.local.hash_error
		}, status_message.VALIDATION_ERROR);
	}

	if (req.body.payment_method == 'knet' && req.body.payment_details && req.body.hash != req.body.payment_details.trackid) {
		save_failed_payment(req);
		return res.out({
			message: req.custom.local.hash_error
		}, status_message.VALIDATION_ERROR);
	}

	let user = req.custom.authorizationObject;
	user.cart = user.cart || {};
	let prods = [];
	if (user && user.cart) {
		for (const i of Object.keys(user.cart)) {
			prods.push(ObjectID(i));
		}
	}
	const up_cart = user.cart;
	req.custom.clean_filter._id = {
		'$in': prods
	};
	mainController.list(req, res, 'product', {
		"_id": 1,
		"name": 1,
		"categories": "$prod_n_categoryArr",
		"picture": 1,
		"price": 1,
		"uom": 1,
		"barcode": 1,
		"weight": 1,
		"prod_n_storeArr": 1,
		"supplier_id": 1
	}, async (out) => {
		if (out.data.length === 0) {
			save_failed_payment(req);
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, status_message.NO_DATA);
		}

		const up_products = JSON.parse(JSON.stringify(out.data));

		const products2save = await products_to_save(out.data, user, req);

		const products = common.group_products_by_suppliers(products2save, req);

		const payment_method = enums_payment_methods(req).find((pm) => pm.id == data.payment_method);

		if (user_info) {
			data.user_data._id = user_info._id;
		}

		const city_collection = req.custom.db.client().collection('city');
		const cityObj = await city_collection
			.findOne({
				_id: ObjectID(req.custom.authorizationObject.city_id.toString())
			})
			.then((c) => c)
			.catch(() => null);
		const shipping_cost = parseInt(cityObj.shipping_cost);
		data.user_data.address.city_name = cityObj.name[req.custom.lang];

		const coupon_collection = req.custom.db.client().collection('coupon');
		const coupon = user.coupon ? await coupon_collection.findOne({
			code: user.coupon.code,
			status: true,
		}).then((coupon) => coupon).catch(() => null) : null;

		const out_coupon = {
			code: coupon ? coupon.code : null,
			value: coupon ? common.getRoundedPrice(coupon.percent_value ? (total_prods * coupon.percent_value) / 100 : coupon.discount_value) : 0
		};

		let total = total_prods + shipping_cost - out_coupon.value;
		total = total > 0 ? total : 0;

		const user_wallet = user_info ? user_info.wallet : 0;
		const wallet2money = user_wallet <= parseInt(total) ? user_wallet : (user_info ? Math.round(total) : 0);

		if (req.body.payment_method == 'wallet' && wallet2money < parseInt(total)) {
			save_failed_payment(req);
			return res.out({
				message: req.custom.local.no_enough_wallet
			}, status_message.VALIDATION_ERROR);
		}

		let discount_by_wallet_value = 0;
		if (req.body.discount_by_wallet == true && wallet2money > 0 && wallet2money < total) {
			total -= wallet2money;
			discount_by_wallet_value = common.getRoundedPrice(wallet2money);
		}

		req.body.discount_by_wallet = req.body.discount_by_wallet == true ? true : false;

		const order_data = {
			order_id: (user_info ? 'u' : 'v') + '_' + shortid.generate(),
			payment_method: payment_method,
			payment_details: data.payment_details,
			subtotal: common.getRoundedPrice(total_prods),
			shipping_cost: common.getRoundedPrice(shipping_cost),
			coupon: out_coupon,
			total: common.getRoundedPrice(total),
			user_data: data.user_data,
			products: products2save,
			hash: req.body.hash,
			delivery_time: req.body.delivery_time,
			discount_by_wallet: req.body.discount_by_wallet,
			discount_by_wallet_value: discount_by_wallet_value,
			store_id: ObjectID(req.custom.authorizationObject.store_id),
			notes: req.body.notes,
			created: new Date(),
			status: 1
		};

		const order_collection = req.custom.db.client().collection('order');
		order_collection.insertOne(order_data)
			.catch((error) => {
				return {
					success: false,
					message: error.message
				}
			});

		order_data.products = products;

		if (data.user_data._id) {
			let points = user_info.points || 0;
			let wallet = user_info.wallet || 0;

			if (req.body.payment_method == 'wallet' || req.body.discount_by_wallet == true) {
				wallet = user_info.wallet - wallet2money;
			} else {
				points += parseInt(total_prods);
			}

			const member_collection = req.custom.db.client().collection('member');
			member_collection.updateOne({
				_id: ObjectID(data.user_data._id.toString())
			}, {
				$set: {
					points: points,
					wallet: wallet
				}
			})
				.catch((error) => { });
		}

		req.custom.authorizationObject.cart = {};
		req.custom.authorizationObject.coupon = {
			code: null,
			value: 0,
		};
		req.custom.cache.set(req.custom.token, req.custom.authorizationObject);

		// Copy to client
		mail.send_mail(req.custom.settings['site_name'][req.custom.lang], data.user_data.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

		// Copy to admin
		mail.send_mail(req.custom.settings['site_name'][req.custom.lang], req.custom.config.mail.username, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

		// Update quantities
		update_quantities(req, up_products, up_cart)

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

	save_failed_payment(req);

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
	const ObjectID = require("@big_store_core/base/types/object_id");
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
	req.custom.limit = 999999;
	mainController.list(req, res, 'product', {
		"_id": 1,
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
		"supplier_id": 1
	}, async (out) => {
		if (out.data.length === 0) {
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, status_message.NO_DATA);
		}

		const products2save = await products_to_save(out.data, user, req, true);

		const products = common.group_products_by_suppliers(products2save, req);

		let total_prods = 0;
		for (const s of Object.keys(products)) {
			for (const p of products[s]) {
				total_prods += p.quantity * p.price;
			}
		}

		const city_collection = req.custom.db.client().collection('city');
		const cityObj = await city_collection
			.findOne({
				_id: ObjectID(req.custom.authorizationObject.city_id.toString())
			})
			.then((c) => c)
			.catch(() => null);
		const shipping_cost = parseInt(cityObj.shipping_cost);


		const coupon_collection = req.custom.db.client().collection('coupon');
		const coupon = user.coupon ? await coupon_collection.findOne({
			code: user.coupon.code,
			status: true,
		}).then((coupon) => coupon).catch(() => null) : null;

		const out_coupon = {
			code: coupon ? coupon.code : null,
			value: coupon ? common.getRoundedPrice(coupon.percent_value ? (total_prods * coupon.percent_value) / 100 : coupon.discount_value) : 0
		};

		let total = total_prods + shipping_cost - out_coupon.value;
		total = total > 0 ? total : 0;


		const user_collection = req.custom.db.client().collection('member');
		const userObj = req.custom.authorizationObject.member_id ? await user_collection
			.findOne({
				_id: ObjectID(req.custom.authorizationObject.member_id.toString())
			})
			.then((c) => c)
			.catch(() => null) : null;

		const user_wallet = userObj ? parseInt(total > userObj.wallet ? userObj.wallet : Math.round(total)) : 0;
		const can_pay_by_wallet = user_wallet >= parseInt(total) ? true : false;

		let payment_methods = enums_payment_methods(req).
			filter(payment_method => {
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
		const min_delivery_time = getRoundedDate(30, new Date(moment().add(min_delivery_time_setting, 'minutes').format(req.custom.config.date.format).toString()));

		let new_date = min_delivery_time;
		for (let idx = 0; idx < 96; idx++) {
			new_date = addMinutes(new_date, 30);
			delivery_times.push(moment(new_date).format(req.custom.config.date.format));
		}

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
			base_address.name = req.custom.local.default_address;
			addresses = [base_address, ...userObj.addresses || []];
		}

		res.out({
			subtotal: common.getRoundedPrice(total_prods),
			shipping_cost: common.getRoundedPrice(shipping_cost),
			coupon: out_coupon,
			discount_by_wallet: user_wallet,
			total: common.getRoundedPrice(total),
			purchase_possibility: purchase_possibility,
			message: message,
			addresses: addresses,
			payment_methods: payment_methods,
			delivery_times: delivery_times,
			products: products
		});
	});
};

async function products_to_save(products, user, req, to_display = false) {
	total_prods = 0;
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

	const out_data = products.map((prod) => {

		prod.quantity = user.cart[prod._id.toString()];
		for (const store of prod.prod_n_storeArr) {
			if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
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

		total_prods += prod.quantity * prod.price;

		return prod;
	});

	return out_data;
}

function save_failed_payment(req) {
	const failed_payment_collection = req.custom.db.client().collection('failed_payment');
	failed_payment_collection.insertOne(req.body)
		.catch((error) => {
			return {
				success: false,
				message: error.message
			}
		});
}

function getRoundedDate(minutes, d = new Date()) {
	let ms = 1000 * 60 * minutes; // convert minutes to ms
	return new Date(Math.round(d.getTime() / ms) * ms);
}

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 60000);
}

function update_quantities(req, the_products, cart) {
	const collection = req.custom.db.client().collection('product');
	let promises = [];

	for (const p of the_products) {
		const quantity = cart[p._id];
		let prod_n_storeArr = [];
		for (const i of p.prod_n_storeArr) {
			if (i.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
				i.quantity -= quantity;
				i.quantity = i.quantity >= 0 ? i.quantity : 0
			}
			i.store_id = ObjectID(i.store_id.toString());
			prod_n_storeArr.push(i);
		}
		const update = collection.updateOne({
			_id: ObjectID(p._id.toString())
		}, {
			$set: { prod_n_storeArr: prod_n_storeArr }
		});
		promises.push(update);
	}

	return Promise.all(promises);
}