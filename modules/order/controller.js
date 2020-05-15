// Orders Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/order/controller');

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	Controller.read(req, res);
};

/**
 * Evaluation order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.evaluate = function (req, res) {
	req.custom.model = require('./model/evaluate');
	Controller.evaluate(req, res);
};
/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.repeat = function (req, res) {
	Controller.repeat(req, res);
};
