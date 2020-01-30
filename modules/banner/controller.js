// Banners Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'banner';

/**
 * List all banners
 * @param {Object} req
 * @param {Object} res
 */
module.exports.random_banner = function (req, res) {
	req.custom.clean_filter.position = req.params.Id;
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_${req.custom.clean_filter.position}`;
	mainController.list_all(req, res, collectionName, {
		position: 1,
		bannertype: 1,
		code: 1,
		picture: 1,
		url: 1,
	}, (data) => {
		const i = data.data[Math.floor(Math.random() * data.data.length)];
		const out = i.bannertype == 1 ? i.code : `<a href="${i.url}"><img src="${i.picture}" style="width: 100%;" /></a>`;
		res.out(out);
	});
};