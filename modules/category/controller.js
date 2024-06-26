// Categories Controller

// Load required modules
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const mainController = require("../../libraries/mainController");
const collectionName = 'category';

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.clean_sort = {
		"category_n_storeArr.sorting": 1
	};

	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;

	if (req.query && req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
		req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_supplier_${req.query.supplier_id}`;
		//req.custom.cache_key += `__supplier_id_${req.query.supplier_id}`;
	} else {
		req.custom.clean_filter['supplier_id'] = { $exists: false };
	}

	if (req.query.featured == 'true') {
		req.custom.cache_key += `__features`;
		req.custom.clean_filter['featured'] = {
			$gt: 0
		};
		req.custom.clean_sort = {
			"featured": 1
		};
	}

	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"parent_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"picture": {
			$ifNull: [`$picture_lang.${req.custom.lang}`, `$picture`]
		},
	}, async (out) => {

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

		const productCollection = req.custom.db.collection('product');
		const categoriesWithProducts = await Promise.all(childs.map(async category => {
			const hasProducts = await productCollection.findOne({ 'prod_n_categoryArr.category_id': ObjectID(category._id.toString()), status: true });
			return hasProducts ? category : null;
		}));
		childs = categoriesWithProducts.filter(category => category !== null);

		rows.map((i) => {
			i.children = childs.filter((c) => c.parent_id.toString() === i._id.toString());
		});

		const message = rows.length > 0 ? status_message.DATA_LOADED : status_message.NO_DATA;

		if (req.custom.cache_key && rows.length > 0) {
			req.custom.cache.set(req.custom.cache_key, {
				"count": rows.length,
				"data": rows
			}, req.custom.config.cache.life_time.data).catch((e) => console.error(req.originalUrl, e));
		}

		res.out({
			"count": rows.length,
			"data": rows
		}, message);
	});
};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"picture": 1
	}, (doc) => {
		if (req.query && req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
			req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
		} else {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		}

		req.custom.clean_filter['parent_id'] = ObjectID(req.params.Id);

		mainController.list_all(req, res, collectionName, {
			"_id": 1,
			"name": {
				$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
			},
			"description": {
				$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
			},
			"picture": 1
		}, (out) => {
			return res.out({ ...doc, children: out.data });
		});
	});
};

/**
 * List ranks by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.ranks = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.cache_key = `${collectionName}_${req.custom.lang}_ranks_${req.params.Id}`;
	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, status_message.INVALID_URL_PARAMETER);
	}
	req.custom.clean_filter = {
		category_id: ObjectID(req.params.Id)
	};
	req.custom.clean_sort = {
		"sorting": 1
	};
	mainController.list_all(req, res, 'rank', {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"picture": 1
	});
};