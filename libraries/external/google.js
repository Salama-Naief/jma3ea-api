// Slides Controller

// Load required modules
const status_message = require('../../enums/status_message');
const config = require('../../config');
const googleMapsClient = require('@google/maps').createClient({
	key: config.google_api_key,
	Promise: Promise
});

module.exports.valid_gmap_address = async function (req, res, body) {
	return Promise.resolve(true);
	if ((!body.latitude && !body.longitude) || !config.google_api_key) {
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
			message: req.custom.local.invalid_location
		}, status_message.VALIDATION_ERROR);
		return false;
	}

	const geo_city = geo_info.results.find((i) => i.types.indexOf('sublocality') > -1);
	if (!geo_city) {
		res.out({
			message: req.custom.local.invalid_location
		}, status_message.VALIDATION_ERROR);
		return false;
	}

	const geo_city_info = geo_city.address_components.find((i) => i.types.indexOf('sublocality') > -1);

	const cityCollection = req.custom.db.collection('city');
	const cityObj = await cityCollection.findOne({
		$where: function () {
			for (var key in this.name) {
				if (this.name[key].toString() === geo_city_info.long_name.toString()) {
					return true;
				}
			}
			return false;
		}
	}).then((c) => c).catch((e) => console.error(req.originalUrl, e));
	if (!cityObj) {
		res.out({
			message: req.custom.local.invalid_location
		}, status_message.VALIDATION_ERROR);
		return false;
	}
	return true;
}
