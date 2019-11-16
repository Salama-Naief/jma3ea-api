// Checkout Controller
const ObjectID = require("mongodb").ObjectID;
const uuid = require('uuid');
const enums = require('../../libraries/enums');
const mainController = require("../../libraries/mainController");
const mail = require("../../libraries/mail");
const mail_view = require("./view/mail");

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
	}).catch(() => null);

	if (user_info) {
		req.body.user_data = user_info;
	}

	let hash = uuid();

	if (only_validation && !req.body.hash) {
		req.body.hash = hash;

		req.custom.authorizationObject.hash = hash;
		await req.custom.cache.set(req.custom.token, req.custom.authorizationObject);

	}

	req.custom.model = require('./model/buy');
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
	req.custom.clean_filter._id = {
		'$in': prods
	};
	mainController.list(req, res, 'product', {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"categories": `$prod_n_categoryArr.name.${req.custom.config.local}`,
		"picture": 1,
		"price": 1,
		"prod_n_storeArr": 1
	}, async (out) => {
		if (out.data.length === 0) {
			save_failed_payment(req);
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, enums.status_message.NO_DATA);
		}

		const products = group_products_by_suppliers(out.data, user, req);

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

		const coupon_collection = req.custom.db.client().collection('coupon');
		const coupon = user.coupon ? await coupon_collection.findOne({
			code: user.coupon.code,
			status: true,
		}).then((coupon) => coupon).catch(() => null) : null;

		const out_coupon = {
			code: coupon ? coupon.code : null,
			value: coupon ? (coupon.percent_value ? (total_prods * coupon.percent_value) / 100 : coupon.discount_value) : 0
		};

		let total = total_prods + shipping_cost - out_coupon.value;
		total = total > 0 ? total : 0;

		const order_data = {
			payment_method: payment_method,
			payment_details: data.payment_details,
			subtotal: total_prods,
			shipping_cost: shipping_cost,
			coupon: out_coupon,
			total: total,
			user_data: data.user_data,
			products: products,
			hash: req.body.hash,
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
			const points = parseInt(total_prods) + (data.user_data.points ? parseInt(data.user_data.points) : 0);
			const member_collection = req.custom.db.client().collection('member');
			member_collection.updateOne({
					_id: ObjectID(data.user_data._id.toString())
				}, {
					$set: {
						points: points
					}
				})
				.catch((error) => {});
		}

		// Copy to client
		mail.send_mail(req.custom.settings['site_name'][req.custom.lang], data.user_data.email, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

		// Copy to admin
		mail.send_mail(req.custom.settings['site_name'][req.custom.lang], req.custom.config.mail.username, req.custom.local.new_order, mail_view.mail_checkout(order_data, req.custom)).catch(() => null);

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
		"categories": `$prod_n_categoryArr.name.${req.custom.config.local}`,
		"picture": 1,
		"price": 1,
		"prod_n_storeArr": 1
	}, async (out) => {
		if (out.data.length === 0) {
			return res.out({
				products: req.custom.local.cart_has_not_products
			}, enums.status_message.NO_DATA);
		}

		const products = group_products_by_suppliers(out.data, user, req);

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
			value: coupon ? (coupon.percent_value ? (total_prods * coupon.percent_value) / 100 : coupon.discount_value) : 0
		};

		let total = total_prods + shipping_cost - out_coupon.value;
		total = total > 0 ? total : 0;

		const payment_methods = require('../../libraries/enums').payment_methods.filter(payment_method => !(total == 0 && payment_method.valid == true));

		res.out({
			subtotal: total_prods.toFixed(3),
			shipping_cost: shipping_cost.toFixed(3),
			coupon: out_coupon,
			total: total.toFixed(3),
			payment_methods: payment_methods,
			products: products
		});
	});
};

function group_products_by_suppliers(products, user, req) {
	total_prods = 0;
	return products.reduce((prod, curr) => {
		curr.supplier = curr.supplier || req.custom.settings['site_name'][req.custom.lang]
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