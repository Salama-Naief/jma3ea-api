// Pages Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'page';

/**
 * List all pages
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
req.custom.ignoreCity = true;
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
    mainController.list_all(req, res, collectionName, {
        "_id": 1,
        "name": { $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`] }
    });
};
/**
 * Read page by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
req.custom.ignoreCity = true;
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_id_${req.params.Id}`;
    mainController.read(req, res, collectionName, {
        "_id": 1,
        "name": { $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`] },
        "description": { $ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`] },
        "keywords": { $ifNull: [`$keywords.${req.custom.lang}`, `$keywords.${req.custom.config.local}`] },
        "contents": { $ifNull: [`$contents.${req.custom.lang}`, `$contents.${req.custom.config.local}`] }
    });
};

