// Products Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require('../../libraries/common');
const status_message = require('../../enums/status_message');
const ObjectID = require("../../types/object_id");
const { Client } = require('@elastic/elasticsearch');
const { getTermLang } = require("./utils");

const collectionName = 'product';

const esClient = new Client({ node: 'http://localhost:9200' });

module.exports.collectionName = collectionName;

/**
 * List all products
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async function (req, res) {
	try {
		req.custom.isProducts = true;
		const name = common.parseArabicNumbers(req.query.q);

		if (req.query) {
			if (req.query.brand_id && req.query.brand_id !== "all") {
				req.custom.clean_filter['brand_id'] = new ObjectID(req.query.brand_id);
			}
			if (req.query.category_id && req.query.category_id !== "all") {
				req.custom.clean_filter['prod_n_categoryArr.category_id'] = new ObjectID(req.query.category_id);
			}

			if (req.query.sortBy && req.query.sorting) {
				if (req.query.sortBy == "name") {
					req.custom.clean_sort = { ["name." + req.custom.lang]: parseInt(req.query.sorting) };
				} else {
					req.custom.clean_sort = { [req.query.sortBy]: parseInt(req.query.sorting) };
				}
			}

			if (req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
				req.custom.clean_filter['supplier_id'] = new ObjectID(req.query.supplier_id);
				/* if (req.custom.cache_key) {
					req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}__supplier_${req.query.supplier_id}_page_${req.custom.skip}_limit_${req.custom.limit}`;
				} */
			}

		}

		const page_size = parseInt(req.query.limit || req.custom.config.db.limit);
		const isInstantSearch = req.query.instant;

		if (/^\d+$/.test(name)) {
			req.custom.clean_filter["barcode"] = name;
		} else {
			const textSearch = {
				multi_match: {
					query: name,
					fields: ['name.en', 'name.ar'],
					type: 'most_fields',
					operator: 'or',
					fuzziness: 'AUTO'
				},
			};


			const page = parseInt(req.query.page) || 1;
			const from = (page - 1) * page_size;

			const searchQuery = {
				bool: {
					should: [textSearch],
				},
			};

			const body = await esClient.search({
				index: 'products',
				body: {
					query: {
						bool: {
							should: [
								{
									match: {
										'name.ar': {
											query: name,
											fuzziness: 'AUTO', // Use 'AUTO' to allow slight spelling differences
										},
									},
								},
							],
							must: [
								{
									match: {
										'name.ar': name, // Exact match
									},
								},
							],
						},
					},
					from: from,
					size: page_size,
				},
			});

			console.log('this is the body: ', body);

			const totalResults = body.hits.total.value;
			const totalPages = Math.ceil(totalResults / page_size);

			let searchResults = body.hits.hits.map((hit) => hit._source);

			if (!isInstantSearch) {
				const skus = searchResults.map((p) => p.sku);
				req.custom.clean_filter['sku'] = { $in: skus };
				mainController.list(req, res, collectionName, {
					"_id": 0,
					"sku": 1,
					"name": {
						$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
					},
					"picture": 1,
					"old_price": 1,
					"price": 1,
					"availability": `$prod_n_storeArr`,
					"has_variants": { $isArray: "$variants" },
					"prod_n_storeArr": 1,
					"prod_n_categoryArr": 1,
					"max_quantity_cart": {
						$ifNull: ["$max_quantity_cart", 0]
					},
					"name_length": {
						$strLenCP: { $ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`] }
					},
					"show_discount_percentage": 1,
					"discount_price_valid_until": 1
				}, (out) => {
					out.total = totalResults;
					/* const products = out.data;
					const skuIndexMap = new Map();
					skus.forEach((sku, index) => skuIndexMap.set(sku, index));

					// Sort the 'products' array based on the order of SKUs in 'skus' array
					const sortedProducts = products.sort((a, b) => {
						const indexA = skuIndexMap.get(a.sku);
						const indexB = skuIndexMap.get(b.sku);
						return indexA - indexB;
					});

					out.data = sortedProducts; */

					return res.out(out);
				});

			} else {
				return res.json({
					total: totalResults,
					count: searchResults.length,
					per_page: req.custom.limit,
					current_page: req.query.skip || 1,
					totalPages,
					data: searchResults,
				});
			}

		}
	} catch (error) {
		console.error('Error searching for products:', error);
		res.status(500).json({ error: 'Internal server error' });
	}

};

/**
 * List products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.listByCategory = function (req, res) {
	req.custom.isProducts = true;

	if (req.query.featured == 'true') {
		//req.custom.clean_filter['feature_id'] = ObjectID(req.params.Id);
		req.custom.clean_filter['$or'] = [{ 'feature_id': ObjectID(req.params.Id) }, { 'features.feature_id': ObjectID(req.params.Id) }];
	} else {
		req.custom.clean_filter['prod_n_categoryArr.category_id'] = ObjectID(req.params.Id);
	}

	if (req.params.rankId) {
		req.custom.clean_filter['prod_n_categoryArr.rank_id'] = ObjectID(req.params.rankId);
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_category_${req.params.Id}_rank_${req.params.rankId}_page_${req.custom.skip}_limit_${req.custom.limit}`;
	} else {
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_category_${req.params.Id}_page_${req.custom.skip}_limit_${req.custom.limit}`;
	}

	if (req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
		req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
		if (req.custom.cache_key) {
			req.custom.cache_key += `_supplier_${req.query.supplier_id}`;
		}
	}

	if (req.custom.isVIP == true) {
		req.custom.cache_key += '__vip';
	}

	mainController.list(req, res, collectionName, {
		"_id": 0,
		"sku": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"picture": 1,
		"old_price": 1,
		"price": 1,
		"availability": `$prod_n_storeArr`,
		"has_variants": { $isArray: "$variants" },
		"prod_n_storeArr": 1,
		"prod_n_categoryArr": 1,
		"max_quantity_cart": {
			$ifNull: ["$max_quantity_cart", 0]
		},
		"supplier_id": 1,
		"show_discount_percentage": 1,
		"discount_price_valid_until": 1
	});
};

/**
 * List featured products by category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.featured = async function (req, res) {

	const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';
	/* if (!city_id) {
		return res.out({
			'message': req.custom.local.choose_city_first
		}, status_message.CITY_REQUIRED);
	} */

	req.custom.limit = 999;

	const collectionFeature = 'feature';

	let user = req.custom.authorizationObject;
	user.cart = user.cart || {};
	user.wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];

	const cache = req.custom.cache;
	let cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_featred`;

	if (req.query.supplier_id && ObjectID.isValid(req.query.supplier_id)) {
		req.custom.clean_filter['supplier_id'] = new ObjectID(req.query.supplier_id);
		cache_key += `__supplier_${req.query.supplier_id}`;
	} else {
		req.custom.clean_filter['supplier_id'] = { $exists: false };
	}

	if (req.custom.isVIP == true) {
		cache_key += '__vip';
		req.custom.clean_filter['$or'] = [
			{ 'show_in_vip': true },
			{ 'only_vip': true }
		]
	} else {
		req.custom.clean_filter['$or'] = [
			{ 'only_vip': { $exists: false } },
			{ 'only_vip': false }
		]
	}


	if (cache_key) {
		let cached_data = await cache.get(cache_key).catch(() => null);
		if (cached_data) {
			cached_data = cached_data.map((feature_category) => {

				feature_category.products = feature_category.products.map((i) => {

					const prod_exists_in_cart = i.sku && Object.keys(user.cart).indexOf(i.sku.toString()) > -1;
					i.cart_status = {
						is_exists: prod_exists_in_cart,
						quantity: prod_exists_in_cart ? user.cart[i.sku.toString()] : 0
					};
					i.wishlist_status = {
						is_exists: i.sku && user.wishlist.indexOf(i.sku.toString()) > -1
					};

					return i;

				});

				return feature_category;
			});
			return res.out(cached_data);
		}
	}

	req.custom.clean_sort = {
		"sorting": 1
	};

	//req.custom.cache_key = false;
	mainController.list(req, res, collectionFeature, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		}
	}, async (features) => {
		try {
			const slideCollection = req.custom.db.client().collection("slide");
			const slides = await slideCollection.find({ features: { $in: [...features.data.map(f => ObjectID(f._id.toString())), ...features.data.map(f => f._id.toString())] } }).toArray() || [];
			const featured = [];
			for (const c of features.data) {
				const filteredSlides = slides.filter(s => s.features && s.features.map(f => f.toString()).includes(c._id.toString()) && s.language_code == req.custom.lang);
				/* if (c._id.toString() == '6455fffd20ed6601d895d416') {
					console.log('slides: ', slides.length, features.data.map(f => ObjectID(f._id.toString())));
				} */
				c.slides = filteredSlides.map(s => ({ _id: s._id, name: s.name, picture: `${req.custom.config.media_url}${s.picture}`, url: s.url }));
				const filter = {};
				filter['status'] = true;
				//filter['feature_id'] = c._id;
				filter['$or'] = [{ 'feature_id': c._id }, { 'features.feature_id': c._id }]
				const projection = {
					"_id": 0,
					"sku": 1,
					"name": {
						$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
					},
					"picture": 1,
					"old_price": 1,
					"price": 1,
					"availability": `$prod_n_storeArr`,
					"has_variants": { $isArray: "$variants" },
					"prod_n_storeArr": 1,
					"prod_n_categoryArr": 1,
					"max_quantity_cart": {
						$ifNull: ["$max_quantity_cart", 0]
					},
					"supplier_id": 1,
					"show_discount_percentage": 1,
					"discount_price_valid_until": 1,
					"vip_old_price": 1,
					"vip_price": 1,
					"vip_discount_price_valid_until": 1,
				};

				/* const sort = {
					"features.sorting": 1,
					"feature_sorting": 1,
					"created": -1
				}; */

				// Pipeline
				const pipeline = [
					// Stage 1
					{
						$match: filter
					},
					// Stage 
					{
						$addFields: {
							featureSorting: {
								$ifNull: ["$features.sorting", "$feature_sorting"]
							}
						}
					},
					// Stage 4
					{
						$sort: {
							featureSorting: 1,
							"created": -1
						}
					},
					// Stage 2
					{
						$limit: 25
					},
					// Stage 3
					{
						$project: projection
					}
				];
				const options = {
					"allowDiskUse": true
				};

				const collection = req.custom.db.client().collection(collectionName);
				c.products = await new Promise((resolve, reject) => {
					collection.aggregate(pipeline, options).toArray((err, results) => {
						if (err) {
							console.log('ERROR: ', err);
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

						/* if (req.custom.isVIP == true && i.old_price && i.old_price > 0) {
							i.price = i.old_price;
							i.old_price = 0;
						} */

						if (req.custom.isVIP == true) {
							if (i.vip_old_price && i.vip_old_price > 0 && (i.vip_discount_price_valid_until ? i.vip_discount_price_valid_until < new Date() : false)) {
								i.vip_price = i.vip_old_price;
								i.vip_old_price = 0
							}

							if (i.vip_price && i.vip_price > 0) {
								i.price = i.vip_price;
								i.old_price = i.vip_old_price;
							} else {
								if (i.old_price && i.old_price > 0) {
									i.price = i.old_price;
									i.old_price = 0;
								}
							}
						}

						i.price = common.getFixedPrice(i.price);
						i.old_price = common.getFixedPrice(i.old_price || 0);

						const quantity_store = i.availability ? i.availability.find((p_n_s) => {
							if (!p_n_s.feed_from_store_id && p_n_s.store_id.toString() === req.custom.authorizationObject.store_id.toString()) {
								return p_n_s;
							} else if (p_n_s.feed_from_store_id) {
								const temp_store = i.availability.find((t_s) => t_s.store_id.toString() == p_n_s.feed_from_store_id.toString());
								p_n_s.quantity = temp_store ? parseInt(temp_store.quantity) : 0;
								return p_n_s;
							}
						}) : null;

						i.availability = quantity_store && quantity_store.quantity > 0;

						const prod_exists_in_cart = i.sku && Object.keys(user.cart).indexOf(i.sku.toString()) > -1;
						i.cart_status = {
							is_exists: prod_exists_in_cart,
							quantity: prod_exists_in_cart ? user.cart[i.sku] : 0
						};
						i.wishlist_status = {
							is_exists: i.sku && user.wishlist.indexOf(i.sku.toString()) > -1
						};

						return i;
					});
					c.products = c.products.filter((i) => i.availability);
					featured.push(c);
				}
			}

			if (cache_key && featured.length > 0) {
				cache.set(cache_key, featured, req.custom.config.cache.life_time).catch(() => null);
			}

			res.out(featured);
		} catch (err) {
			return res.out({
				'message': err.message
			}, status_message.UNEXPECTED_ERROR);
		}
	});
};

/**
 * Read product by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = async function (req, res) {

	let user = req.custom.authorizationObject;
	user.cart = user.cart || {};
	user.wishlist = Array.isArray(user.wishlist) ? user.wishlist : [];
	const prod_exists_in_cart = Object.keys(user.cart).indexOf(req.params.sku.toString()) > -1;

	const cache = req.custom.cache;
	let cache_key = `${collectionName}_${req.custom.lang}_store_${req.custom.authorizationObject.store_id}_id_${req.params.sku}`;

	if (req.custom.isVIP == true) {
		cache_key += '__vip';
	}

	req.custom.ignoreCity = true;
	req.custom.authorizationObject.store_id = req.custom.authorizationObject.store_id || '000000000000000000000000';

	cache.get(cache_key).
		then((cached_data) => {

			if (cached_data) {

				cached_data.cart_status = {
					is_exists: prod_exists_in_cart,
					quantity: prod_exists_in_cart ? user.cart[cached_data.sku] : 0
				};
				cached_data.wishlist_status = {
					is_exists: user.wishlist.indexOf(cached_data.sku) > -1
				};

				if (cached_data.variants && cached_data.variants.length > 0) {
					cached_data.variants = cached_data.variants.map((v) => {

						const prod_exists_in_cart = Object.keys(user.cart).indexOf(v.sku.toString()) > -1;
						v.cart_status = {
							is_exists: prod_exists_in_cart,
							quantity: prod_exists_in_cart ? user.cart[v.sku.toString()] : 0
						};
						v.wishlist_status = {
							is_exists: user.wishlist.indexOf(v.sku.toString()) > -1
						};

						return v;
					});
				}

				return res.out(cached_data);
			}

			req.custom.isProducts = true;
			mainController.read(req, res, collectionName, {
				"_id": 0,
				"sku": 1,
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
				"barcode": 1,
				"soft_code": 1,
				"weight": 1,
				"max_quantity_cart": {
					$ifNull: ["$max_quantity_cart", 0]
				},
				"prod_n_storeArr": 1,
				"prod_n_categoryArr": 1,
				"variants": 1,
				"supplier_id": 1,
				"show_discount_percentage": 1,
				"discount_price_valid_until": 1,
				"vip_price": 1,
				"vip_old_price": 1,
				"vip_discount_price_valid_until": 1,
			}, async (results) => {
				if (!results || !results.sku) {
					return res.out(results, status_message.NO_DATA);
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

				const store_id = req.custom.authorizationObject.store_id.toString();

				if (results.variants) {
					results.variants = results.variants.map((v) => {
						const store = v.prod_n_storeArr && v.prod_n_storeArr.find((s) => s.store_id && s.store_id.toString() === store_id && parseInt(s.quantity) > 0 && s.status === true);
						if (store) {
							v.max_quantity_cart = store.max_quantity_cart || results.max_quantity_cart;
							v.price = common.getFixedPrice(v.price || results.price);
							delete v.prod_n_storeArr;

							v.options = v.options ? v.options.filter((v_exists) => v_exists.name && v_exists.type && v_exists.value).map((v_option) => {
								return {
									label: v_option.option.name[req.custom.lang] || v_option.option.name[req.custom.config.local],
									name: v_option.name[req.custom.lang] || v_option.name[req.custom.config.local],
									sku_code: v_option.sku_code,
									type: v_option.type,
									value: v_option.value,
								};
							}) : [];

							if (v.name && v.name[req.custom.lang]) {
								v.name = v.name[req.custom.lang];
							} else {
								v.name = results.name;
							}


							if (v.description && v.description[req.custom.lang]) {
								v.description = v.description[req.custom.lang];
							} else {
								v.description = results.description;
							}

							if (v.keywords && v.keywords[req.custom.lang]) {
								v.keywords = v.keywords[req.custom.lang];
							} else {
								v.keywords = results.keywords;
							}

							if (v.contents && v.contents[req.custom.lang]) {
								v.contents = v.contents[req.custom.lang];
							} else {
								v.contents = results.contents;
							}


							if (v.gallery_pictures) {
								v.gallery_pictures = v.gallery_pictures.map((p) => {
									return `${req.custom.config.media_url}${p}`;
								});
							} else {
								v.gallery_pictures = results.gallery_pictures;
							}

							const prod_exists_in_cart = Object.keys(user.cart).indexOf(v.sku.toString()) > -1;
							v.cart_status = {
								is_exists: prod_exists_in_cart,
								quantity: prod_exists_in_cart ? user.cart[v.sku.toString()] : 0
							};
							v.wishlist_status = {
								is_exists: user.wishlist.indexOf(v.sku.toString()) > -1
							};

							return v;
						}
					}).filter((v) => v && v.options && v.options.length > 0);
					results.availability = true;
				} else {
					const quantity_store = prod_n_storeArr ? prod_n_storeArr.find((p_n_s) => {
						if (!p_n_s.feed_from_store_id && p_n_s.store_id.toString() === req.custom.authorizationObject.store_id.toString()) {
							return p_n_s;
						} else if (p_n_s.feed_from_store_id) {
							const temp_store = prod_n_storeArr.find((t_s) => t_s.store_id && p_n_s.feed_from_store_id && t_s.store_id.toString() == p_n_s.feed_from_store_id.toString());
							p_n_s.quantity = temp_store ? parseInt(temp_store.quantity) : 0;
							return p_n_s;
						}
					}) : null;

					results.availability = quantity_store && quantity_store.quantity > 0;
				}


				if (results.brand) {
					const brand_collection = req.custom.db.client().collection('brand');
					const brand = await brand_collection.findOne({
						status: true
					}).then((b) => b).catch(() => { });
					results.brand = brand ? brand.name[req.custom.local] || brand.name[req.custom.config.local] : null;
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
						const cat_obj = all_categories.find((c) => c._id && i.category_id && c._id.toString() == i.category_id.toString());
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

				/* if (req.custom.isVIP == true && results.old_price && results.old_price > 0) {
					results.price = results.old_price;
					results.old_price = 0;
				} */

				if (req.custom.isVIP == true) {
					if (results.vip_old_price && results.vip_old_price > 0 && (results.vip_discount_price_valid_until ? results.vip_discount_price_valid_until < new Date() : false)) {
						results.vip_price = results.vip_old_price;
						results.vip_old_price = 0
					}

					if (results.vip_price && results.vip_price > 0) {
						results.price = results.vip_price;
						results.old_price = results.vip_old_price;
					} else {
						if (results.old_price && results.old_price > 0) {
							results.price = results.old_price;
							results.old_price = 0;
						}
					}
				}

				results.price = common.getFixedPrice(results.price);
				results.old_price = common.getFixedPrice(results.old_price || 0);

				if (cache_key && Object.keys(results).length > 0) {
					cache.set(cache_key, results, req.custom.config.cache.life_time).catch(() => null);
				}

				results.cart_status = {
					is_exists: prod_exists_in_cart,
					quantity: prod_exists_in_cart ? user.cart[results.sku] : 0
				};
				results.wishlist_status = {
					is_exists: user.wishlist.indexOf(results.sku && results.sku.toString()) > -1
				};

				res.out(results);
			});

		}).
		catch(() => res.out({
			'message': err.message
		}, status_message.UNEXPECTED_ERROR));
};
