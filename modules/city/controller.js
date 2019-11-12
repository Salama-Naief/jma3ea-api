// Cities Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require('mongodb').ObjectID;
const collectionName = 'city';

/**
 * List all cities
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.limit = 99999;
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"country": {
			$ifNull: [`$country_obj.name.${req.custom.lang}`, `$country_obj.name.${req.custom.config.local}`]
		},
		"parent_id": 1,
		"store_id": 1
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
		res.out({
			"total": rows.length,
			"count": rows.length,
			"per_page": rows.length,
			"current_page": 1,
			"data": rows
		});
	});
};

/**
 * List products by country
 * @param {Object} req
 * @param {Object} res
 */
module.exports.listByCountry = function (req, res) {
	req.custom.clean_filter.country_id = ObjectID(req.params.Id);
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_country_${req.params.Id}`;
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"parent_id": 1,
		"store_id": 1
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

		if (req.custom.cache_key && rows.length > 0) {
			req.custom.cache.set(req.custom.cache_key, {
				"count": rows.length,
				"data": rows
			}, req.custom.config.cache_life_time).catch(() => null);
		}
		
		res.out({
			"count": rows.length,
			"data": rows
		});
	});
};

/**
 * Read city by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"country": {
			$ifNull: [`$country_obj.name.${req.custom.lang}`, `$country_obj.name.${req.custom.config.local}`]
		},
		"store_id": 1
	});
};