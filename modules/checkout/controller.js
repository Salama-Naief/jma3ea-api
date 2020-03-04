// Checkout Controller
const ObjectID = require("mongodb").ObjectID;
const uuid = require('uuid');
const common = require('../../libraries/common');
const enums = require('../../libraries/enums');
const mainController = require("../../libraries/mainController");
const mail = require("../../libraries/mail");
const mail_view = require("./view/mail");
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
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
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
		return res.out(error, enums.status_message.VALIDATION_ERROR);
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
		}, enums.status_message.VALIDATION_ERROR);
	}

	if (req.body.payment_method == 'knet' && req.body.payment_details && req.body.hash != req.body.payment_details.trackid) {
		save_failed_payment(req);
		return res.out({
			message: req.custom.local.hash_error
		}, enums.status_message.VALIDATION_ERROR);
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
		"prod_n_storeArr": 1
	}, async (out) => {
		if (out.data.length === 0) {
			save_failed_payment(req);
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, enums.status_message.NO_DATA);
		}

		const up_products = JSON.parse(JSON.stringify(out.data));

		const products = await group_products_by_suppliers(out.data, user, req);

		const payment_method = require('../../libraries/enums').payment_methods.find((pm) => pm.id == data.payment_method);


		req.custom.authorizationObject.cart = {};
		req.custom.authorizationObject.coupon = {
			code: null,
			value: 0,
		};
		req.custom.cache.set(req.custom.token, req.custom.authorizationObject)

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
			}, enums.status_message.VALIDATION_ERROR);
		}

		let discount_by_wallet_value = 0;
		if (req.body.discount_by_wallet == true && wallet2money > 0 && wallet2money < total) {
			total -= wallet2money;
			discount_by_wallet_value = common.getRoundedPrice(wallet2money);
		}

		req.body.discount_by_wallet = req.body.discount_by_wallet == true ? true : false;

		const order_data = {
			order_id: shortid.generate(),
			payment_method: payment_method,
			payment_details: data.payment_details,
			subtotal: common.getRoundedPrice(total_prods),
			shipping_cost: common.getRoundedPrice(shipping_cost),
			coupon: out_coupon,
			total: common.getRoundedPrice(total),
			user_data: data.user_data,
			products: products,
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
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
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
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const mainController = require("../../libraries/mainController");
	const ObjectID = require('mongodb').ObjectID;
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
		"prod_n_storeArr": 1
	}, async (out) => {
		if (out.data.length === 0) {
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, enums.status_message.NO_DATA);
		}

		const products = await group_products_by_suppliers(out.data, user, req);

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

		const payment_methods = enums.payment_methods.
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

		let min_delivery_time_setting = new Date();
		if (Date.parse(req.custom.settings.orders.min_delivery_time) > 0 &&
			Date.parse(req.custom.settings.orders.min_delivery_time.toLocaleString()) > Date.parse(new Date().toLocaleString())) {
			min_delivery_time_setting = new Date(req.custom.settings.orders.min_delivery_time.toLocaleString());
		}
		const min_delivery_time = getRoundedDate(30, addMinutes(min_delivery_time_setting, 30));

		let new_date = min_delivery_time;
		for (let idx = 0; idx < 96; idx++) {
			new_date = addMinutes(new_date, 30);
			delivery_times.push(new_date.toLocaleString());
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

async function group_products_by_suppliers(products, user, req) {
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
	return products.reduce((prod, curr) => {
		curr.supplier = curr.supplier || req.custom.settings['site_name']['en']
		//If this supplier wasn't previously stored
		if (!prod[curr.supplier]) {
			prod[curr.supplier] = [];
		}
		curr.quantity = user.cart[curr._id.toString()];

		curr.quantity = user.cart[curr._id.toString()];
		for (const store of curr.prod_n_storeArr) {
			if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
				if (store.status == false || store.quantity <= 0) {
					curr.quantity = 0;
					curr.warning = req.custom.local.cart_product_unavailable;
				} else if (store.quantity < curr.quantity) {
					curr.quantity = store.quantity;
					curr.warning = req.custom.local.cart_product_exceeded_allowed_updated;
				}
				break;
			}
		}

		delete curr.prod_n_storeArr;
		if (curr.categories) {
			curr.categories = curr.categories.map((i) => {
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
			curr.categories = curr.categories.filter((i) => i != null);
		} else {
			curr.categories = [];
		}

		prod[curr.supplier].push(curr);
		total_prods += curr.quantity * curr.price;
		return prod;
	}, {});
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