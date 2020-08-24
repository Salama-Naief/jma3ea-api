// Categories Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/category/controller');

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	Controller.read(req, res);
};

/**
 * List ranks by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.ranks = function (req, res) {
	Controller.ranks(req, res);
};

/**
 * List all categories for store
 * @param {Object} req
 * @param {Object} res
 */
module.exports.store = function (req, res) {
	Controller.store(req, res);
};