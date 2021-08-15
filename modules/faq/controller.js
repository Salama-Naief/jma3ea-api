// Faqs Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'faq';

/**
 * List all faqs
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"question": {
			$ifNull: [`$question.${req.custom.lang}`, `$question.${req.custom.config.local}`]
		},
		"answer": {
			$ifNull: [`$answer.${req.custom.lang}`, `$answer.${req.custom.config.local}`]
		},
	});
};