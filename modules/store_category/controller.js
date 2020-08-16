// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/store_category/controller');

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
    Controller.list(req, res);
};

/**
 * Read one slide
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
    Controller.read(req, res);
};
