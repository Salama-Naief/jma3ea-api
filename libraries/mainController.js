// Categories Controller

// Load required modules
const enums = require('./enums');
const ObjectID = require('mongodb').ObjectID;

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res, collectionName, projection, callback) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const cache = req.custom.cache;
	if (req.custom.cache_key) {
		const cached_data = await cache.get(req.custom.cache_key).catch(() => null);
		if (cached_data) {
			return res.out(cached_data);
		}
	}
	const collection = req.custom.db.client().collection(collectionName);
	const filter = req.custom.clean_filter;
	if (req.custom.all_status != true) {
		filter.status = req.custom.clean_filter.status || true;
	}
	if (req.custom.isProducts == true) {
		filter["prod_n_storeArr.store_id"] = ObjectID(req.custom.authorizationObject.store_id);

		const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';
		if (!city_id) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, enums.status_message.CITY_REQUIRED);
		}

	}

	collection.count(req.custom.clean_filter, (err, total) => {
		if (err || total === 0) {
			const out = {
				total: 0,
				count: 0,
				per_page: req.custom.limit,
				current_page: req.query.skip || 1,
				data: []
			};
			if (callback) {
				callback(out);
			} else {
				res.out(out);
			}
		} else {
			let sort = Object.keys(req.custom.clean_sort).length > 0 ? req.custom.clean_sort : {
				"sorting": 1,
				"name": 1
			};

			// Pipeline
			let pipeline = [];

			if (req.custom.isProducts && ["/:Id/category", "/:Id/category/:rankId/rank"].indexOf(req.route.path) > -1) {

				pipeline.push({
					$match: {
						"prod_n_categoryArr.category_id": ObjectID(req.params.Id)
					}
				});

				pipeline.push({
					$addFields: {
						"order": {
							"$filter": {
								"input": "$prod_n_categoryArr",
								"as": "p",
								"cond": {
									"$eq": ["$$p.category_id", ObjectID(req.params.Id)]
								}
							}
						}
					}
				});

				sort = {
					"order.sorting": 1
				};
			}

			pipeline.push({
				$match: filter
			});

			pipeline.push({
				$sort: sort
			});

			pipeline.push({
				$skip: req.custom.skip
			});

			pipeline.push({
				$limit: req.custom.limit
			});

			pipeline.push({
				$project: projection
			});

			const options = {
				"allowDiskUse": true
			};

			collection.aggregate(pipeline, options).toArray((err, results) => {
				if (err) {
					return res.out({
						'message': err.message
					}, enums.status_message.UNEXPECTED_ERROR);
				}
				const out = {
					total: total,
					count: results.length,
					per_page: req.custom.limit,
					current_page: req.query.skip || 1,
					data: results ? results.map((i) => {
						if (i.picture) {
							i.picture = `${req.custom.config.media_url}${i.picture}`;
						}
						if (req.custom.isProducts == true) {
							i.price = i.price.toFixed(3);
							i.old_price = (i.old_price || 0).toFixed(3);
						}
						return i;
					}) : []
				};
				if (callback) {
					callback(out);
				} else {

					if (req.custom.cache_key && results.length > 0) {
						cache.set(req.custom.cache_key, out, req.custom.config.cache.life_time).catch(() => null);
					}
					const message = results.length > 0 ? enums.status_message.DATA_LOADED : enums.status_message.NO_DATA;
					res.out(out, message);
				}
			});
		}

	});
};

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list_all = async function (req, res, collectionName, projection, callback) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const cache = req.custom.cache;
	if (req.custom.cache_key) {
		const cached_data = await cache.get(req.custom.cache_key).catch(() => null);
		if (cached_data) {
			return res.out(cached_data);
		}
	}
	const collection = req.custom.db.client().collection(collectionName);
	const filter = req.custom.clean_filter;
	filter.status = true;

	const sort = Object.keys(req.custom.clean_sort).length > 0 ? req.custom.clean_sort : {
		"sorting": 1,
		"name": 1
	};

	// Pipeline
	const pipeline = [
		// Stage 1
		{
			$match: filter
		},
		// Stage 2
		{
			$project: projection
		},
		// Stage 3
		{
			$sort: sort
		}
	];
	const options = {
		"allowDiskUse": true
	};

	collection.aggregate(pipeline, options).toArray((err, results) => {
		if (err) {
			return res.out({
				'message': err.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}
		const out = {
			count: results.length,
			data: results ? results.map((i) => {
				if (i.picture) {
					i.picture = `${req.custom.config.media_url}${i.picture}`;
				}
				return i;
			}) : []
		};
		const message = results.length > 0 ? enums.status_message.DATA_LOADED : enums.status_message.NO_DATA;

		if (callback) {
			callback(out);
		} else {

			if (req.custom.cache_key && results.length > 0) {
				cache.set(req.custom.cache_key, out, req.custom.config.cache.life_time).catch(() => null);
			}

			res.out(out, message);
		}
	});

};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = async function (req, res, collectionName, projection, callback) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}

	const cache = req.custom.cache;
	if (req.custom.cache_key) {
		const cached_data = await cache.get(req.custom.cache_key).catch(() => null);
		if (cached_data) {
			return res.out(cached_data);
		}
	}

	const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';
	if (!city_id) {
		return res.out({
			'message': req.custom.local.choose_city_first
		}, enums.status_message.CITY_REQUIRED);
	}

	const collection = req.custom.db.client().collection(collectionName);
	// Pipeline
	const pipeline = [
		// Stage 1
		{
			$match: {
				"_id": ObjectID(req.params.Id),
				"status": true
			}
		},
		// Stage 2
		{
			$project: projection
		},
		// Stage 3
		{
			$limit: 1
		}
	];
	const options = {
		"allowDiskUse": true
	};
	collection.aggregate(pipeline, options).toArray((err, results) => {
		if (err) {
			return res.out({
				'error': err.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}
		const row = results[0] || {};
		if (row.picture) {
			row.picture = `${req.custom.config.media_url}${row.picture}`;
		}

		if (callback) {
			callback(row);
		} else {

			if (req.custom.cache_key && Object.keys(row).length > 0) {
				cache.set(req.custom.cache_key, row, req.custom.config.cache.life_time).catch(() => null);
			}

			const message = Object.keys(row) > 0 ? enums.status_message.DATA_LOADED : enums.status_message.NO_DATA;
			res.out(row, message);
		}
	});
};