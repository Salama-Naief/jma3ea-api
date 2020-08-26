// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/store/controller');

/**
 * List stores 
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
    Controller.list(req, res);
};

/**
 * List stores by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.category = function (req, res) {
    Controller.category(req, res);
};
