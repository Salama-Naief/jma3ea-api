// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/address/controller');


/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.get = function (req, res) {
	Controller.get(req, res);
};

/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.insert = function (req, res) {
	Controller.insert(req, res);
};

/**
 * Update exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = function (req, res) {
	Controller.update(req, res);
};

/**
 * Delete exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = function (req, res) {
	Controller.remove(req, res);
};
