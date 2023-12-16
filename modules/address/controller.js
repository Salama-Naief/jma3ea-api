// Slides Controller

// Load required modules
const google = require('../../libraries/external/google');
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const profile = require('../profile/controller');
const collectionName = 'member';


/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.get = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	profile.getInfo(req).
		then((user) => {

			if (!user) {
				return res.out({
					"message": req.custom.local.no_user_found
				}, status_message.VALIDATION_ERROR);
			}

			const cityCollection = req.custom.db.collection('city');
			cityCollection.find({}).toArray().
				then((cities) => {

					user.addresses = user.addresses || [];
					user.address.id = 'primary';
					user.address.name = req.custom.local.default_address;
					user.addresses = [user.address, ...user.addresses];
					user.addresses = user.addresses.map((i) => {
						const parent_city = cities.find((c) => c._id && i.city_id && c._id.toString() == i.city_id.toString());

						i.country_id = parent_city ? parent_city.country_id : null;
						i.parent_city_id = parent_city ? parent_city.parent_id : null;

						return i;
					});

					res.out(user.addresses);

				});
		}).
		catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
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
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.collection(collectionName);
	req.custom.model = req.custom.model || require('./model/address');
	const {
		data,
		error
	} = action != 'remove' ? await req.custom.getValidData(req) : {};
	if (error && Object.keys(error).length > 0) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const user = await profile.getInfo(req).catch((e) => {
		console.error(req.originalUrl, e);
		return null;
	});

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, status_message.VALIDATION_ERROR);
	}

	if (action == 'remove' && req.params.Id === 'primary') {
		return res.out({
			"message": req.custom.local.can_not_delete_default_address
		}, status_message.VALIDATION_ERROR);
	}

	let address = user.address;
	let addresses = user.addresses || [];
	let updated_data = {};

	if (action == 'insert' || action == 'update') {
		if (!await google.valid_gmap_address(req, res, req.body)) {
			return false;
		}
	}

	if (action == 'insert') {
		const exists = addresses.find((a) => a.name == data.name);
		if (exists || data.name == req.custom.local.default_address) {
			return res.out({
				"name": req.custom.local.address_name_exists
			}, status_message.VALIDATION_ERROR);
		}
		data.id = new ObjectID();
		addresses.push(data);
		updated_data = {
			addresses: addresses
		};
	} else if (action == 'update') {
		if (req.params.Id != 'primary') {
			addresses = addresses.map((a) => {
				if (a.id.toString() == req.params.Id.toString()) {
					return { ...a, ...data };
				}
				return a;
			});
			updated_data = {
				addresses: addresses
			};
		} else {
			address = data;
			updated_data = {
				address: address
			};
		}
	} else if (action == 'remove') {
		addresses = addresses.filter((a) => {
			return a.id && a.id.toString() != req.params.Id.toString();
		});
		updated_data = {
			addresses: addresses
		};
	}

	collection.updateOne({
		_id: ObjectID(user._id)
	}, {
		$set: updated_data
	})
		.then((response) => res.out({
			message: req.custom.local.saved_done
		})).
		catch((e) => {
			console.error(req.originalUrl, e);
			res.out({ 'message': e.message }, status_message.UNEXPECTED_ERROR)
		});
}
