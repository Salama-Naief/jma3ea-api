// Supports Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const status_message = require('../../enums/status_message');
const collectionName = 'support';

/**
 * List all supports
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"parent_id": 1,
		"enable_chatting": 1,
		"enable_rating": 1,
	}, (out) => {
		let rows = [];
		let childs = [];
		if (out.data && out.data.length > 0) {
			for (const i of out.data) {
				if (!i.parent_id) {
					rows.push(i);
				} else {
					childs.push(i);
				}
			}
		}
		rows.map((i) => {
			i.children = childs.filter((c) => c.parent_id.toString() === i._id.toString());
		});
		const message = out.data.length > 0 ? status_message.DATA_LOADED : status_message.NO_DATA;

		if (req.custom.cache_key && rows.length > 0) {
			req.custom.cache.set(req.custom.cache_key, {
				"count": rows.length,
				"data": rows
			}, req.custom.config.cache.life_time.data).catch((e) => console.error(e));
		}

		res.out({
			"count": rows.length,
			"data": rows
		}, message);
	});
};