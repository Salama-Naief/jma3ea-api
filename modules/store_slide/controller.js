// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/store_slide/controller');

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.store = function (req, res) {
    Controller.store(req, res);
};

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.category = function (req, res) {
    Controller.category(req, res);
};
