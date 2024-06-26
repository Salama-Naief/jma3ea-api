// Banners Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");
const collectionName = 'banner';

/**
 * List all banners
 * @param {Object} req
 * @param {Object} res
 */
module.exports.random_banner = function (req, res) {
	req.custom.clean_filter.position = req.params.Id;
	const key = req.query.category || req.query.feature || '';
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_${req.custom.clean_filter.position}_${key}`;
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
	} else if (req.query.feature && ObjectID.isValid(req.query.feature)) {
		req.custom.clean_filter['$or'] = [{
			features: {
				$exists: false
			}
		},
		{
			features: {
				$eq: []
			}
		},
		{
			features: {
				$eq: null
			}
		},
		{
			features: req.query.feature
		}
		];
	}

	if (req.query && req.query.supplier_id) {
		if (ObjectID.isValid(req.query.supplier_id)) {
			req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
			req.custom.cache_key = `${collectionName}_${req.custom.lang}_supplier_${req.query.supplier_id}`;
		} else {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		}
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