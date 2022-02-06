// Device Controller
const collectionName = 'device';
const status_message = require('../../enums/status_message');

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
	const collection = req.custom.db.client().collection(collectionName);
	collection.count(req.custom.clean_filter, (err, total) => {
		if (err) {
			return res.out({ message: err.message }, status_message.UNEXPECTED_ERROR);
		}
		if (total === 0) {
			return res.out({ count: 0, total: 0, links: [], data: [] }, status_message.NO_DATA);
		}
		collection
			.find(req.custom.clean_filter)
			.sort(req.custom.clean_sort)
			.limit(req.custom.limit)
			.skip(req.custom.skip)
			.toArray(function (err, docs) {
				if (err) {
					return res.out({ message: err.message }, status_message.UNEXPECTED_ERROR);
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
	const collection = req.custom.db.client().collection(collectionName);
	collection.createIndex({ token: 1 }, { unique: true });
	collection.insertOne(data)
		.then((response) => {
			res.out({ message: req.custom.local.device_added, insertedId: response.insertedId });
		})
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