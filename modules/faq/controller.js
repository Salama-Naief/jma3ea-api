// Faqs Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/faq/controller');

/**
 * List all faqs
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};