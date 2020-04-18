// Products Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/product/controller');

/**
 * List all products
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};

/**
 * List products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.listByCategory = function (req, res) {
	Controller.listByCategory(req, res);
};

/**
 * List featured products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.featured = async function (req, res) {
	Controller.featured(req, res);
};

/**
 * Read product by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = async function (req, res) {
	Controller.read(req, res);
};