// Slides Controller

// Load required modules
const enums = require('./enums');
const config = require('./config');
const googleMapsClient = require('@google/maps').createClient({
	key: config.google_api_key,
	Promise: Promise
});


module.exports.getRoundedPrice = function (price) {
	return (Math.ceil(price * 200) / 200).toFixed(3);
}

module.exports.valid_gmap_address = async function (req, res, body) {
	if (!body.latitude && !body.longitude) {
		return true;
	}
	const geo_info = await googleMapsClient.reverseGeocode({
		latlng: `${body.latitude},${body.longitude}`
	})
		.asPromise()
		.then((geo_res) => geo_res.json)
		.catch((err) => null);

	if (!geo_info || !geo_info.results) {
		res.out({
			"message": req.custom.local.invalid_location
		}, enums.status_message.VALIDATION_ERROR);
		return false;
	}

	const geo_city = geo_info.results.find((i) => i.types.indexOf('sublocality') > -1);
	if (!geo_city) {
		res.out({
			"message": req.custom.local.invalid_location
		}, enums.status_message.VALIDATION_ERROR);
		return false;
	}

	const geo_city_info = geo_city.address_components.find((i) => i.types.indexOf('sublocality') > -1);

	const cityCollection = req.custom.db.client().collection('city');
	const cityObj = await cityCollection.findOne({
		$where: function () {
			for (var key in this.name) {
				if (this.name[key] == geo_city_info.long_name) {
					return true;
				}
			}
			return false;
		}
	}).then((c) => c).catch(() => null);
	if (!cityObj) {
		res.out({
			"message": req.custom.local.invalid_location
		}, enums.status_message.VALIDATION_ERROR);
		return false;
	}
	return true;
}

module.exports.group_products_by_suppliers = async function (products, user, req) {
	total_prods = 0;
	let all_categories = [];
	await (async () => {
		const cache = req.custom.cache;
		const cache_key = `category_all_solid`;
		all_categories = await cache.get(cache_key).catch(() => null);
		if (!all_categories) {
			const category_collection = req.custom.db.client().collection('category');
			all_categories = await category_collection.find({
				status: true
			})
				.toArray() || [];
			if (all_categories) {
				cache.set(cache_key, all_categories, req.custom.config.cache.life_time).catch(() => null);
			}
		}
	})();
	return products.reduce((prod, curr) => {
		curr.supplier = curr.supplier || req.custom.settings['site_name']['en']
		//If this supplier wasn't previously stored
		if (!prod[curr.supplier]) {
			prod[curr.supplier] = [];
		}
		curr.quantity = user.cart[curr._id.toString()];

		curr.quantity = user.cart[curr._id.toString()];
		for (const store of curr.prod_n_storeArr) {
			if (store.store_id.toString() == req.custom.authorizationObject.store_id.toString()) {
				if (store.status == false || store.quantity <= 0) {
					curr.quantity = 0;
					curr.warning = req.custom.local.cart_product_unavailable;
				} else if (store.quantity < curr.quantity) {
					curr.quantity = store.quantity;
					curr.warning = req.custom.local.cart_product_exceeded_allowed_updated;
				}
				break;
			}
		}

		delete curr.prod_n_storeArr;
		if (curr.categories) {
			curr.categories = curr.categories.map((i) => {
				const cat_obj = all_categories.find((c) => c._id.toString() == i.category_id.toString());
				if (cat_obj) {
					const y = {};
					y._id = cat_obj._id;
					y.name = cat_obj.name;
					if (y._id && y.name) {
						return y;
					}
				}
			});
			curr.categories = curr.categories.filter((i) => i != null);
		} else {
			curr.categories = [];
		}

		prod[curr.supplier].push(curr);
		total_prods += curr.quantity * curr.price;
		return prod;
	}, {});
}