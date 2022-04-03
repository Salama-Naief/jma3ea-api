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
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;

	req.custom.clean_sort = {
		"sorting": 1
	};

	req.custom.clean_filter['language_code'] = req.custom.lang;

	if (req.query.feature && ObjectID.isValid(req.query.feature)) {
		req.custom.clean_filter['features'] = ObjectID(req.query.feature.toString());
	} else {
		req.custom.clean_filter['features'] = { $eq: null };
	}

	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": 1,
		"url": 1,
		"picture": 1
	});
};
