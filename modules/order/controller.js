// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require('../../libraries/common');
const status_message = require('../../enums/status_message');
const ObjectID = require("../../types/object_id");
const { groupBySupplier, products_to_save } = require("../checkout/utils");
const collectionName = 'order';

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.clean_filter = req.custom.clean_filter || {};
	req.custom.clean_filter['user_data._id'] = ObjectID(req.custom.authorizationObject.member_id);
	req.custom.all_status = true;
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"order_id": 1,
		"payment_method": 1,
		"subtotal": 1,
		"total": 1,
		"created": 1,
		"status": 1,
		"evaluation": 1,
		"driver_name": 1,
		"driver_mobile": 1,
		"driver_track_id": 1
	}, (results) => {
		results.data = results.data.map((i) => {
			i.status = req.custom.local.order_status_list[i.status];
			return i;
		});
		res.out(results);
	});
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, status_message.INVALID_URL_PARAMETER);
	}

	const collection = req.custom.db.client().collection('order');
	collection.findOne({
		_id: ObjectID(req.params.Id),
	})
		.then(async (order) => {
			if (!order.data) {
				const productsGroupedBySupplier = groupBySupplier(await reformatOrderSuppliers(order.products, req));

				for (let sup of productsGroupedBySupplier) {
					let supplier_products_total = parseFloat(sup.products.reduce((t_p, { price, quantity }) => parseFloat(t_p) + parseFloat(price) * parseInt(quantity), 0) || 0);

					sup.subtotal = supplier_products_total;

					const supplier_shipping_cost = sup.supplier._id == req.custom.settings['site_id'] ? order.shipping_cost : parseFloat(sup.supplier.shipping_cost);

					supplier_products_total += supplier_shipping_cost;
					sup.shipping_cost = supplier_shipping_cost;
					sup.total = common.getRoundedPrice(supplier_products_total);
				}

				order.data = productsGroupedBySupplier;
			}
			order.products = Array.isArray(order.products) ? common.group_products_by_suppliers(order.products, req) : order.products;
			let products = [];
			for (const supplier_key of Object.keys(order.products)) {
				products[supplier_key] = order.products[supplier_key].map((p) => {
					p.name = p.name[req.custom.lang] || p.name[req.custom.config.local];
					return p;
				});
			}
			order['status_number'] = order.status;
			order.status = req.custom.local.order_status_list[order.status];
			order['all_statuses'] = req.custom.local.order_status_list;
			res.out(order);
		})
		.catch((err) => res.out({
			'message': err.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Evaluation order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.evaluate = async function (req, res) {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.model = req.custom.model || require('./model/evaluate');
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const row = await collection.findOne({
		_id: ObjectID(req.params.Id)
	})
		.then((order_row) => order_row)
		.catch((e) => null);

	if (!row) {
		return res.out({
			"message": req.custom.local.no_data_found
		}, status_message.VALIDATION_ERROR);
	}

	if (row.evaluation) {
		return res.out({
			"message": req.custom.local.evaluated_before
		}, status_message.VALIDATION_ERROR);
	}

	collection.updateOne({
		_id: ObjectID(req.params.Id)
	}, {
		$set: {
			evaluation: {
				driver: data.driver
			}
		}
	})
		.then((response) => res.out({
			message: req.custom.local.thanks_for_evaluation
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.repeat = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, status_message.INVALID_URL_PARAMETER);
	}

	const collection = req.custom.db.client().collection('order');
	collection.findOne({
		_id: ObjectID(req.params.Id),
	})
		.then((order) => {
			const products = {};
			const order_products = Array.isArray(order.products) ? order.products : order.products.Jm3eia;
			for (const prod of order_products) {
				products[prod.sku.toString()] = prod.quantity;
			}

			let user = req.custom.authorizationObject;
			user.cart = products;
			req.custom.cache.set(req.custom.token, user, req.custom.config.cache.life_time.token)
				.then((response) => res.out({
					message: req.custom.local.cart_repeated
				}, status_message.CREATED))
				.catch((error) => res.out({
					'message': error.message
				}, status_message.UNEXPECTED_ERROR));


		})
		.catch((err) => res.out({
			'message': err.message
		}, status_message.UNEXPECTED_ERROR));
};

async function reformatOrderSuppliers(products, req) {

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

	const out_data = products.map((prod) => {

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
			delivery_time_text: supplier.delivery_time_text
		} : {
			_id: req.custom.settings['site_id'],
			name: {
				ar: req.custom.settings['site_name']['ar'],
				en: req.custom.settings['site_name']['en'],
			},
			min_delivery_time: req.custom.settings.orders.min_delivery_time,
			min_value: req.custom.settings.orders.min_value,
			delivery_time_text: "",
		};

		prod.delivery_time = supplier ? supplier.delivery_time : req.body.delivery_time;

		return prod;
	});

	return out_data;
}