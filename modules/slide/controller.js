// Slides Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'slide';

/**
 * List all slides
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
    mainController.list_all(req, res, collectionName, {
        "_id": 1,
        "title": { $ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`] },
        "description": { $ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`] },
        "url": 1,
        "picture": 1
    });
};
