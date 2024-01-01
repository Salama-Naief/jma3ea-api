// Tickers Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'ticker';

/**
 * List all tickers
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"text": {
			$ifNull: [`$text.${req.custom.lang}`, `$text.${req.custom.config.local}`]
		},
		"url": {
			$ifNull: [`$url.${req.custom.lang}`, `$url.${req.custom.config.local}`]
		},
	});
};