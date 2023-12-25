// Brands Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'app_popup';

/**
 * List all brands
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	//req.custom.cache_key = `${collectionName}_${req.custom.lang}__page_${req.custom.skip}`;
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"title": {
			$ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`]
		},
		"details": {
			$ifNull: [`$details.${req.custom.lang}`, `$details.${req.custom.config.local}`]
		},
		"image": {
			$ifNull: [`$image.${req.custom.lang}`, `$image.${req.custom.config.local}`]
		},
		"url": 1,
		"accept_button_route":1,
		"cancel_button_route":1,
		"show_in_route":1,
	}, (out) => {
		if (out.data === 0) {
			return res.out(out);
		}

		out.data = out.data.map(d => {
			if (d.image && d.image != undefined) {
				d.image = d.image.includes(req.custom.config.media_url) ? d.image : (req.custom.config.media_url + d.image);
			}
			return d;
		});

		return res.out(out);


	});
};

/**
 * Read brand by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"title": {
			$ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`]
		},
		"details": {
			$ifNull: [`$details.${req.custom.lang}`, `$details.${req.custom.config.local}`]
		},
		"image": {
			$ifNull: [`$image.${req.custom.lang}`, `$image.${req.custom.config.local}`]
		},
		"url": 1,
		"accept_button_route": 1,
		"cancel_button_route": 1,
		"show_in_route": 1,
	}, (row) => {
		if (row.image && row.image != undefined) {
			row.image = row.image.includes(req.custom.config.media_url) ? row.image : (req.custom.config.media_url + row.image);
		}

		return res.out(row);
	});
};