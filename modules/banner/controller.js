// Banners Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/banner/controller');

/**
 * List all banners
 * @param {Object} req
 * @param {Object} res
 */
module.exports.random_banner = function (req, res) {
	Controller.random_banner(req, res);
};
