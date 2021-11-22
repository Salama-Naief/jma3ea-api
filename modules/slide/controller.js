// Slides Controller

// Load required modules
const mainController = require("../../libraries/mainController");
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

	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": 1,
		"url": 1,
		"picture": 1
	});
};
