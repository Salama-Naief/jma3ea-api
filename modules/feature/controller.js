// Categories Controller

// Load required modules
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const mainController = require("../../libraries/mainController");
const collectionName = 'feature';

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.clean_sort = {
		"features.sorting": 1
	};

	req.custom.cache_key = `${collectionName}_${req.custom.lang}_all`;

	if (req.query && req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
		req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_supplier_${req.query.supplier_id}`;
		//req.custom.cache_key += `__supplier_id_${req.query.supplier_id}`;
	} else {
		req.custom.clean_filter['supplier_id'] = { $exists: false };
	}

	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"expiration_date": 1,
		"expiration_date_message": 1
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
		const categoriesWithProducts = await Promise.all(childs.map(async feature => {
			const products_count = await productCollection.countDocuments({ 'features.feature_id': ObjectID(feature._id.toString()), status: true });
			return products_count > 0 ? feature : null;
		}));
		childs = categoriesWithProducts.filter(feature => feature !== null);

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
		"expiration_date": 1,
		"expiration_date_message": 1
	}, async (doc) => {
		if (req.query && req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
			req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
		} else {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		}
		
		const product_collection = req.custom.db.collection('product');

		const categories = await product_collection.aggregate([
			{ $match: { status: true, $or: [ {'features.feature_id': new ObjectID(doc._id) }, { 'feature_id': new ObjectID(doc._id) } ] } },
			{ $unwind: '$prod_n_categoryArr' },
			{
			  $group: {
				_id: '$prod_n_categoryArr.category_id',
			  },
			},
			{
				$lookup: {
				  from: 'category',
				  localField: '_id',
				  foreignField: '_id',
				  as: 'categoryInfo',
				},
			  },
			  { $unwind: '$categoryInfo' },
			  {
				$project: {
				  _id: '$categoryInfo._id',
				  name: {
					$ifNull: [`$categoryInfo.name.${req.custom.lang}`, `$categoryInfo.name.${req.custom.config.local}`]
				  },
				  //picture: '$categoryInfo.picture',
				},
			  },
		  ]).toArray();

		  return res.out({ ...doc, categories });

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
		feature_id: ObjectID(req.params.Id)
	};
	req.custom.clean_sort = {
		"sorting": 1
	};
	mainController.list_all(req, res, 'feature_rank', {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
	});
};
