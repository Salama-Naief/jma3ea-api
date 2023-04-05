// Slides Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");
const collectionName = 'slide';

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	const feature = req.query.feature;
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_${feature || 'all'}`;

	req.custom.clean_sort = {
		"sorting": 1
	};

	req.custom.clean_filter['language_code'] = req.custom.lang;

	if (feature && ObjectID.isValid(feature)) {
		req.custom.clean_filter['features'] = feature;
	} else {
		req.custom.clean_filter['features'] = { $eq: null };
	}

	if (req.query && req.query.supplier_id) {
		if (ObjectID.isValid(req.query.supplier_id)) {
			req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
			req.custom.cache_key = `${collectionName}_${req.custom.lang}_supplier_${req.query.supplier_id}`;
		} else {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		}
	}

	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": 1,
		"url": 1,
		"picture": 1
	});
};
