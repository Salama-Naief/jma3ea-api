// Checkout Controller
const Controller = require('@big_store_core/api/modules/checkout/controller');


/**
 * Buy product in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.buy = function (req, res) {
	Controller.buy(req, res);
};

/**
 * Save unsuccessfully 
 * @param {Object} req
 * @param {Object} res
 */
module.exports.error = function (req, res) {
	Controller.error(req, res);
};

/**
 * List all products in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};
