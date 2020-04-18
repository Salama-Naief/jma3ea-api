// Brands Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/brand/controller');

/**
 * List all brands
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};

/**
 * Read brand by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	Controller.read(req, res);
};