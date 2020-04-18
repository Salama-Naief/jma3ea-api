// Notifications Controller
// Load required modules
const Controller = require('@big_store_core/api/modules/notification/controller');

/**
 * Read notification by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
    Controller.read(req, res);
};
/**
 * Read notification by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update2sent = function (req, res) {
    Controller.update2sent(req, res);
};