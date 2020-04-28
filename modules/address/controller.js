// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/address/controller');


/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.get = async function (req, res) {
	Controller.get(req, res);
};

/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.insert = async function (req, res) {
	Controller.insert(req, res);
};

/**
 * Update exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	Controller.update(req, res);
};

/**
 * Delete exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = async function (req, res) {
	Controller.remove(req, res);
};
