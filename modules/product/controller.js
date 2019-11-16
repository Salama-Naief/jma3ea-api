// Products Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const enums = require('../../libraries/enums');
const ObjectID = require('mongodb').ObjectID;
const collectionName = 'product';

/**
 * List all products
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	req.custom.isProducts = true;
	const name = req.query.q;
	if (name) {
		const name_f = `name.${req.custom.config.local}`;
		req.custom.clean_filter = {
			...req.custom.clean_filter,
			[name_f]: {
				$regex: `.*${name}.*`
			}
		};
	} else {
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_page_${req.custom.skip}_limit_${req.custom.limit}`;
	}
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"picture": 1,
		"old_price": 1,
		"price": 1
	});
};

/**
 * List products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.listByCategory = function (req, res) {
	req.custom.isProducts = true;
	req.custom.clean_filter['prod_n_categoryArr.category_id'] = ObjectID(req.params.Id);
	if (req.params.rankId) {
		req.custom.clean_filter['prod_n_categoryArr.rank_id'] = ObjectID(req.params.rankId);
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_category_${req.params.Id}_rank_${req.params.rankId}_page_${req.custom.skip}_limit_${req.custom.limit}`;
	} else {
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_category_${req.params.Id}_page_${req.custom.skip}_limit_${req.custom.limit}`;
	}
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"picture": 1,
		"old_price": 1,
		"price": 1
	});
};

/**
 * List featured products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.featured = async function (req, res) {
	req.custom.limit = 10;

	const collectionFeature = 'feature';

	const cache = req.custom.cache;
	const cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_featred`;

	if (cache_key) {
		const cached_data = await cache.get(cache_key).catch(() => null);
		if (cached_data) {
			return res.out(cached_data);
		}
	}

	req.custom.clean_sort = {
		"sorting": 1
	};
	mainController.list(req, res, collectionFeature, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		}
	}, async (features) => {
		const featured = [];
		for (const c of features.data) {
			const filter = {};
			filter['status'] = true;
			filter['feature_id'] = c._id;
			const projection = {
				"_id": 1,
				"name": {
					$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
				},
				"picture": 1,
				"old_price": 1,
				"price": 1
			};

			const sort = {
				"created": -1
			};

			// Pipeline
			const pipeline = [
				// Stage 1
				{
					$match: filter
				},
				// Stage 2
				{
					$limit: 10
				},
				// Stage 3
				{
					$project: projection
				},
				// Stage 4
				{
					$sort: sort
				}
			];
			const options = {
				"allowDiskUse": true
			};

			const collection = req.custom.db.client().collection(collectionName);
			c.products = await new Promise((resolve, reject) => {
				collection.aggregate(pipeline, options).toArray((err, results) => {
					if (err) {
						reject(err);
					}
					resolve(results);
				});
			}).catch(() => null);
			if (c.products.length > 0) {
				c.products = c.products.map((i) => {
					if (i.picture) {
						i.picture = `${req.custom.config.media_url}${i.picture}`;
					}
					i.price = i.price.toFixed(3);
					i.old_price = (i.old_price || 0).toFixed(3);
					return i;
				});
				featured.push(c);
			}
		}

		if (cache_key && featured.length > 0) {
			cache.set(cache_key, featured, req.custom.config.cache.life_time).catch(() => null);
		}

		res.out(featured);
	});
};

/**
 * Read product by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = async function (req, res) {

	const cache = req.custom.cache;
	const cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_id_${req.params.Id}`;
	const cached_data = await cache.get(cache_key).catch(() => null);
	if (cached_data) {
		return res.out(cached_data);
	}

	req.custom.isProducts = true;
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"keywords": {
			$ifNull: [`$keywords.${req.custom.lang}`, `$keywords.${req.custom.config.local}`]
		},
		"contents": {
			$ifNull: [`$contents.${req.custom.lang}`, `$contents.${req.custom.config.local}`]
		},
		"brand": "$brand_id",
		"categories": '$prod_n_categoryArr',
		"picture": 1,
		"gallery_pictures": 1,
		"availability": `$prod_n_storeArr`,
		"old_price": 1,
		"price": 1,
		"soft_code": 1,
		"weight": 1,
		"max_quantity_cart": {
			$ifNull: ["$max_quantity_cart", 0]
		}
	}, async (results) => {
		if (!results || !results._id) {
			res.out(results, enums.status_message.NO_DATA);
		}
		const prod_n_storeArr = results.availability;
		let quantity = 0;
		if (prod_n_storeArr) {
			for (const one_store of prod_n_storeArr) {
				if (one_store.store_id && req.custom.authorizationObject.store_id && one_store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
					quantity = one_store.quantity;
					break;
				}
			}
		}

		results.availability = quantity > 0;

		if (results.brand) {
			const brand_collection = req.custom.db.client().collection('brand');
			const brand = await brand_collection.findOne({
				status: true
			}).then((b) => b).catch(() => {});
			results.brand = brand.name[req.custom.local] || brand.name[req.custom.config.local];
		} else {
			results.brand = null;
		}

		if (results.categories) {
			const category_collection = req.custom.db.client().collection('category');
			const all_categories = await category_collection.find({
					status: true
				})
				.toArray() || [];
			results.categories = results.categories.map((i) => {
				const cat_obj = all_categories.find((c) => c._id.toString() == i.category_id.toString());
				i.name = cat_obj ? cat_obj.name[req.custom.lang] || cat_obj.name[req.custom.config.local] : '';
				return i;
			});
		} else {
			results.categories = [];
		}

		if (results.gallery_pictures) {
			results.gallery_pictures = results.gallery_pictures.map((p) => {
				return `${req.custom.config.media_url}${p}`;
			});
		} else {
			results.gallery_pictures = [];
		}

		results.price = results.price.toFixed(3);
		results.old_price = (results.old_price || 0).toFixed(3);

		if (cache_key && Object.keys(results).length > 0) {
			cache.set(cache_key, results, req.custom.config.cache.life_time).catch(() => null);
		}

		res.out(results);
	});
};