// Countries Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'country';

/**
 * List all countries
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
    mainController.list_all(req, res, collectionName, {
        "_id": 1,
        "name": { $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`] },
        "code": 1
    });
};
/**
 * Read country by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
    mainController.read(req, res, collectionName, {
        "_id": 1,
        "name": { $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`] },
        "code": 1
    });
};