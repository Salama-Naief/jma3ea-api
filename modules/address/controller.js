// Slides Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const enums = require('../../libraries/enums');
const profile = require('../profile/controller');
const collectionName = 'member';
const config = require('../../libraries/config');
const googleMapsClient = require('@google/maps').createClient({
	key: config.google_api_key,
	Promise: Promise
});

/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.get = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const user = await profile.getInfo(req).catch(() => null);

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, enums.status_message.VALIDATION_ERROR);
	}

	const cityCollection = req.custom.db.client().collection('city');
	const cities = await cityCollection.find({}).toArray();

	user.addresses = user.addresses || [];
	user.addresses = user.addresses.map((i) => {
		const parent_city = cities.find((c) => c._id.toString() == i.city_id.toString());

		i.country_id = parent_city ? parent_city.country_id : null;
		i.parent_city_id = parent_city ? parent_city._id : null;

		return i;
	});

	return res.out(user.addresses);
};

/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.insert = async function (req, res) {
	update_user(req, res, 'insert');
};

/**
 * Update exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	update_user(req, res, 'update');
};

/**
 * Delete exists address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = async function (req, res) {
	update_user(req, res, 'remove');
};


async function update_user(req, res, action = 'insert') {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/address');
	if (action == 'update') {
		req.body.name = req.params.Id;
	}
	const {
		data,
		error
	} = action != 'remove' ? await req.custom.getValidData(req) : {};
	if (error && Object.keys(error).length > 0) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const user = await profile.getInfo(req).catch(() => {});

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, enums.status_message.VALIDATION_ERROR);
	}

	let addresses = user.addresses || [];

	if (action == 'insert' || action == 'update') {
		const geo_info = await googleMapsClient.reverseGeocode({
				latlng: `${req.body.latitude},${req.body.longitude}`
			})
			.asPromise()
			.then((geo_res) => geo_res.json)
			.catch((err) => null);

		if (!geo_info || !geo_info.results) {
			return res.out({
				"message": req.custom.local.invalid_location
			}, enums.status_message.VALIDATION_ERROR);
		}

		const geo_city = geo_info.results.find((i) => i.types.indexOf('sublocality') > -1);
		if (!geo_city) {
			return res.out({
				"message": req.custom.local.invalid_location
			}, enums.status_message.VALIDATION_ERROR);
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
			return res.out({
				"message": req.custom.local.invalid_location
			}, enums.status_message.VALIDATION_ERROR);
		}

	}

	if (action == 'insert') {
		const exists = addresses.find((a) => a.name == data.name);
		if (exists) {
			return res.out({
				"name": req.custom.local.address_name_exists
			}, enums.status_message.VALIDATION_ERROR);
		}
		addresses.push(data);
	} else if (action == 'update') {
		addresses = addresses.map((a) => {
			if (a.name == req.params.Id) {
				data.name = req.params.Id;
				return data;
			}
			return a;
		});
	} else if (action == 'remove') {
		addresses = addresses.filter((a) => {
			return a.name != req.params.Id;
		});
	}

	collection.updateOne({
			_id: ObjectID(user._id)
		}, {
			$set: {
				addresses: addresses
			}
		})
		.then((response) => res.out({
			message: req.custom.local.saved_done
		}))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
}