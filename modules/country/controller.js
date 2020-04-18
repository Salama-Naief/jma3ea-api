// Countries Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/country/controller');

/**
 * List all countries
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};
/**
 * Read country by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
    Controller.read(req, res);
};