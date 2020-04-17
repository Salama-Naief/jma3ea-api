// Slides Controller

// Load required modules
const google = require('@big_store_core/base/libraries/external/google');
const ObjectID = require("@big_store_core/base/types/object_id");
const status_message = require('@big_store_core/base/enums/status_message');
const profile = require('../profile/controller');
const collectionName = 'member';


/**
 * Register new address
 * @param {Object} req
 * @param {Object} res
 */
module.exports.get = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const user = await profile.getInfo(req).catch(() => null);

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, status_message.VALIDATION_ERROR);
	}

	const cityCollection = req.custom.db.client().collection('city');
	const cities = await cityCollection.find({}).toArray();

	user.addresses = user.addresses || [];
	user.address.name = req.custom.local.default_address;
	user.addresses = [user.address, ...user.addresses];
	user.addresses = user.addresses.map((i) => {
		const parent_city = cities.find((c) => c._id.toString() == i.city_id.toString());

		i.country_id = parent_city ? parent_city.country_id : null;
		i.parent_city_id = parent_city ? parent_city.parent_id : null;

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
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
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
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const user = await profile.getInfo(req).catch(() => { });

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, status_message.VALIDATION_ERROR);
	}

	if (action == 'remove' && req.params.Id == req.custom.local.default_address) {
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
		addresses.push(data);
		updated_data = {
			addresses: addresses
		};
	} else if (action == 'update') {
		if (req.params.Id != req.custom.local.default_address) {
			addresses = addresses.map((a) => {
				if (a.name == req.params.Id) {
					data.name = req.params.Id;
					return data;
				}
				return a;
			});
			updated_data = {
				addresses: addresses
			};
		}else{
			address = data;
			updated_data = {
				address: address
			};
		}
	} else if (action == 'remove') {
		addresses = addresses.filter((a) => {
			return a.name != req.params.Id;
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
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
}