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
	if (req.query.show_in_ticker == 'true') {
		req.custom.clean_filter['show_in_ticker'] = true;
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_show_in_ticker`;
	} else if (req.query.show_in_ticker == 'false') {
		req.custom.clean_filter['show_in_ticker'] = false;
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_show_in_ticker_false`;
	}
	
	if (req.query.show_in_featured_categories == 'true') {
		req.custom.clean_filter['show_in_featured_categories'] = true;
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_show_in_featured_categories`;
	} else if (req.query.show_in_featured_categories == 'false') {
		req.custom.clean_filter['show_in_featured_categories'] = false;
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_show_in_featured_categories_false`;
	}
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"content": {
			$ifNull: [`$content.${req.custom.lang}`, `$content.${req.custom.config.local}`]
		},
		"link": 1,
		"sorting": 1
	});
};