// Banners Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require('mongodb').ObjectID;
const collectionName = 'banner';

/**
 * List all banners
 * @param {Object} req
 * @param {Object} res
 */
module.exports.random_banner = function (req, res) {
	req.custom.clean_filter.position = req.params.Id;
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_${req.custom.clean_filter.position}`;
	if (req.query.category && ObjectID.isValid(req.query.category)) {
		req.custom.clean_filter['$or'] = [{
				categories: {
					$exists: false
				}
			},
			{
				categories: {
					$eq: []
				}
			},
			{
				categories: {
					$eq: null
				}
			},
			{
				categories: req.query.category
			}
		];
	}
	mainController.list_all(req, res, collectionName, {
		_id: 0,
		bannertype: 1,
		code: 1,
		picture: 1,
		url: 1,
	}, (data) => {
		const out = data.data[Math.floor(Math.random() * data.data.length)];
		if (out) {
			return res.out(out);
		}
		res.out(null);
	});
};