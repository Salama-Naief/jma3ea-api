// Slides Controller

// Load required modules
const enums = require('./enums');
const config = require('./config');
const googleMapsClient = require('@google/maps').createClient({
	key: config.google_api_key,
	Promise: Promise
});


module.exports.getRoundedPrice = function (price) {
	return (Math.ceil(parseFloat(price) * 200) / 200).toFixed(3);
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

module.exports.group_products_by_suppliers = (products, req) => {
	return products.reduce((prod, curr) => {
		curr.supplier_id = curr.supplier_id || req.custom.settings['site_name'][req.custom.lang];
		prod[curr.supplier_id] = prod[curr.supplier_id] || [];
		prod[curr.supplier_id].push(curr);
		return prod;
	}, {});
}