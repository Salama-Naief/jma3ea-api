// Supports Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/support/controller');

/**
 * List all supports
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};