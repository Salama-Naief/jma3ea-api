// Categories Controller

// Load required modules
const MainController = require('@big_store_core/api/libraries/mainController');

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res, collectionName, projection, callback) {
	MainController.list(req, res, collectionName, projection, callback);
};

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list_all = async function (req, res, collectionName, projection, callback) {
	MainController.list_all(req, res, collectionName, projection, callback);
};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = async function (req, res, collectionName, projection, callback) {
	MainController.read(req, res, collectionName, projection, callback);
};