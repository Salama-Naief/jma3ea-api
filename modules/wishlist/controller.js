// Carts Controller
const Controller = require('@big_store_core/api/modules/wishlist/controller');

/**
 * Add new product to Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add = async function (req, res) {
	req.custom.model = require('./model/add');
	Controller.add(req, res);
};

/**
 * Remove product from Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = async function (req, res) {
	Controller.remove(req, res);
};

/**
 * List all products in Cart
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res) {
	Controller.list(req, res);
};
