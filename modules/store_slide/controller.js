// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/store_slide/controller');

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
    Controller.list(req, res);
};
