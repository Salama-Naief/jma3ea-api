// Brands Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'app_popup';

/**
 * List all brands
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}__page_${req.custom.skip}`;
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"title": {
			$ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`]
		},
		"details": {
			$ifNull: [`$details.${req.custom.lang}`, `$details.${req.custom.config.local}`]
		},
		"image": {
			$ifNull: [`$image.${req.custom.lang}`, `$image.${req.custom.config.local}`]
		},
		"accept_button_route":1,
		"cancel_button_route":1,
		"show_in_route":1,
	});
};

/**
 * Read brand by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"title": {
			$ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`]
		},
		"details": {
			$ifNull: [`$details.${req.custom.lang}`, `$details.${req.custom.config.local}`]
		},
		"image": {
			$ifNull: [`$image.${req.custom.lang}`, `$image.${req.custom.config.local}`]
		},
		"accept_button_route": 1,
		"cancel_button_route": 1,
		"show_in_route": 1,
	});
};