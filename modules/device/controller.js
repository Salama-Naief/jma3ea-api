// Device Controller
const mainController = require("../../libraries/mainController");
const status_message = require('../../enums/status_message');
const ObjectID = require("../../types/object_id");
const collectionName = 'device';

/**
 * List all devices
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.clean_sort = { "_id": 1 };
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const city_id = req.query.city_id;
	if (city_id && city_id !== '') {
		req.custom.clean_filter['city_id'] = ObjectID(city_id);
	}
	const lang = req.query.lang;
	if (!lang) {
		return res.out({ message: req.custom.local.errors.is_not_valid('Language') }, status_message.INVALID_URL_PARAMETER);
	}
	const collection = req.custom.db.client().collection(collectionName);
	collection.count(req.custom.clean_filter, (e, total) => {
		if (e) {
			console.error(req.originalUrl, e);
			return res.out({ message: e.message }, status_message.UNEXPECTED_ERROR);
		}
		if (total === 0) {
			return res.out({ count: 0, total: 0, links: [], data: [] }, status_message.NO_DATA);
		}
		req.custom.clean_filter.language = lang;
		collection
			.find(req.custom.clean_filter)
			.sort(req.custom.clean_sort)
			.limit(req.custom.limit)
			.skip(req.custom.skip)
			.toArray(function (e, docs) {
				if (e) {
					console.error(req.originalUrl, e);
					return res.out({ message: e.message }, status_message.UNEXPECTED_ERROR);
				}
				res.out({
					total: total,
					count: docs.length,
					per_page: req.custom.limit,
					current_page: req.query.skip || 1,
					data: docs
				});
			});
	});
};

module.exports.getDevicesWithCity = async (req, res) => {
	req.custom.clean_filter['city_id'] = { $exists: true };
	const collection = req.custom.db.client().collection(collectionName);
	collection.count(req.custom.clean_filter, (e, total) => {
		if (e) {
			console.error(req.originalUrl, e);
			return res.out({ message: e.message }, status_message.UNEXPECTED_ERROR);
		}
		if (total === 0) {
			return res.out({ count: 0, total: 0, links: [], data: [] }, status_message.NO_DATA);
		}
		collection
			.find(req.custom.clean_filter)
			.sort(req.custom.clean_sort)
			.limit(req.custom.limit)
			.skip(req.custom.skip)
			.toArray(function (e, docs) {
				console.error(req.originalUrl, e);
				if (e) {
					return res.out({ message: e.message }, status_message.UNEXPECTED_ERROR);
				}
				res.out({
					total: total,
					count: docs.length,
					per_page: req.custom.limit,
					current_page: req.query.skip || 1,
					data: docs
				});
			});
	});
}

/**
 * Add new device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.model = req.custom.model || require('./model/add');
	let { data, error } = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}
	data.language = req.custom.lang || 'ar';

	const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

	if (city_id && ObjectID.isValid(city_id)) data.city_id = ObjectID(city_id);

	const collection = req.custom.db.client().collection(collectionName);
	collection.createIndex({ token: 1 }, { unique: true });
	collection.insertOne(data)
		.then((response) => {
			res.out({ message: req.custom.local.device_added, insertedId: response.insertedId });
		})
		.catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};

/**
 * Update device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({ message: 'Url is not valid' }, status_message.VALIDATION_ERROR);
	}

	const data = {};

	data.language = req.custom.lang || 'ar';

	const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

	if (city_id && ObjectID.isValid(city_id)) data.city_id = ObjectID(city_id);

	const collection = req.custom.db.client().collection(collectionName);
	collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: data })
		.then((response) =>
			res.out({
				message: req.custom.local.saved_done
			}, status_message.UPDATED))
		.catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};

/**
 * Remove Device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const tokens = req.body.tokens;
	if (!tokens) {
		res.out({ message: req.custom.local.no_devices_removed });
	}
	collection.deleteMany({ token: { "$in": tokens } })
		.then((response) => {
			res.out({ message: req.custom.local.devices_removed });
		})
		.catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};