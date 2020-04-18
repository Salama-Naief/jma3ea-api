// Cities Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/city/controller');

/**
 * List all cities
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};

/**
 * List products by country
 * @param {Object} req
 * @param {Object} res
 */
module.exports.listByCountry = function (req, res) {
	Controller.listByCountry(req, res);
};

/**
 * Read city by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	Controller.read(req, res);
};
