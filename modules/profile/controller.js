// Slides Controller

// Load required modules
const ObjectID = require("@big_store_core/base/types/object_id");
const status_message = require('@big_store_core/base/enums/status_message');
const mail = require('@big_store_core/base/libraries/mail');
const google = require('@big_store_core/base/libraries/external/google');
const common = require('@big_store_core/base/libraries/common');
const sha1 = require('sha1');
const md5 = require('md5');
const auth = require('../auth/controller');
const mail_forgotpassword_view = require("./view/forgotpassword");
const mail_register_view = require("./view/register");
const collectionName = 'member';

/**
 * Display profile data
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	getInfo(req).then((decoded) => {
		if (!decoded) {
			return res.out({
				message: req.custom.local.no_data_found
			}, status_message.NO_DATA);
		}
		if (decoded.password) {
			delete decoded.password;
		}
		res.out(decoded);
	}).catch((e) => {
		res.out({
			message: e.message
		}, status_message.UNEXPECTED_ERROR);
	});

};

/**
 * login
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const usercollection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;

	if (!req.body.username || !req.body.password) {
		return res.out({
			message: local.failed_auth_user
		}, status_message.INVALID_USER_AUTHENTICATION);
	}

	usercollection.findOne({
		username: req.body.username,
		password: sha1(md5(req.body.password))
	}).then((theuser) => {
		if (!theuser) {
			return res.out({
				message: local.failed_auth_user
			}, status_message.INVALID_USER_AUTHENTICATION);
		}
		// create a token
		const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';


		if (!ObjectID.isValid(cityid)) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, status_message.CITY_REQUIRED);
		}

		fix_user_data(req, theuser, cityid);

		const token = 'u_' + auth.generateToken();
		const data = req.custom.authorizationObject;
		data.member_id = theuser._id;
		delete theuser.password;
		req.custom.cache.set(token, data)
			.then(() => {
				res.out({
					token: token,
					user: theuser
				});
			})
			.catch(() => res.out({
				message: local.failed_create_auth_app
			}, status_message.UNEXPECTED_ERROR));

	}).catch(() => res.out({
		error: local.failed_auth_user
	}, status_message.UNEXPECTED_ERROR));
};

/**
 * logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
	const collection = req.custom.db.client().collection('token');
	const where = {
		token: token
	};

	collection.deleteOne(where, function (err, result) { });

	return res.out({
		'message': req.custom.local.logout_done
	});
};


/**
 * Register new user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.register = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/register');
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error && Object.keys(error).length > 0) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	if (!await google.valid_gmap_address(req, res, req.body.address)) {
		return false;
	}

	data.password = sha1(md5(data.password));
	collection.insertOne(data)
		.then(async (response) => {

			mail.send_mail(req.custom.settings['site_name'][req.custom.lang], data.email, req.custom.local.mail.registerion_subject, mail_register_view.mail_register(data, req.custom)).catch(() => null);

			res.out({
				message: `${req.custom.local.registered_successfully} ${data.fullname}`,
				insertedId: response.insertedId
			});
		})
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/update');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const user = await getInfo(req).catch(() => { });

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, status_message.VALIDATION_ERROR);
	}

	collection.updateOne({
		_id: ObjectID(user._id)
	}, {
		$set: data
	})
		.then((response) => res.out({
			message: req.custom.local.saved_done
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Change password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatepassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/updatepassword');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	let userdecode = {};
	if (!error || (error && !error.old_password)) {
		userdecode = await getInfo(req).catch(() => { });
		userdecode = userdecode || {};
		const user = await collection.findOne({
			_id: ObjectID(userdecode._id.toString()),
			password: sha1(md5(req.body.old_password))
		});
		if (!user) {
			error = error || {};
			error.old_password = 'old password is not correct';
		}
	}
	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	data.password = sha1(md5(data.new_password));
	collection.updateOne({
		_id: ObjectID(userdecode._id.toString())
	}, {
		$set: {
			password: data.password
		}
	})
		.then((response) => res.out({
			message: req.custom.local.saved_done
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Forgot password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.forgotpassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./model/forgotpassword');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const userCollection = req.custom.db.client().collection('member');
	const userObj = await userCollection.findOne({
		email: data.email
	}).then((c) => c).catch(() => { });

	const reset_hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

	const forgotpassword_data = {
		reset_hash: reset_hash,
		user: userObj
	};

	const collection = req.custom.db.client().collection(collectionName);
	collection.updateOne({
		_id: userObj._id
	}, {
		$set: {
			reset_hash: reset_hash
		}
	})
		.then((response) => {

			mail.send_mail(req.custom.settings.site_name[req.custom.lang], data.email,
				req.custom.local.mail.reset_password_subject,
				mail_forgotpassword_view.mail_forgotpassword(forgotpassword_data, req.custom)).catch(() => null);

			res.out({
				message: req.custom.local.mail.reset_password_link_sent,
			});

		})
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Reset password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.resetpassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/resetpassword');
	req.body.reset_hash = req.params.hash;
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const userCollection = req.custom.db.client().collection('member');
	const user = await userCollection.findOne({
		reset_hash: req.params.hash
	}).then((c) => c).catch(() => null);

	if (!user) {
		res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR);
	}

	const password = sha1(md5(data.new_password));
	collection.updateOne({
		_id: ObjectID(user._id.toString())
	}, {
		$set: {
			password: password,
		},
		$unset: {
			reset_hash: 1
		},
	})
		.then((response) => res.out({
			message: req.custom.local.password_has_been_updated
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Change city
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatecity = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./model/updatecity');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		// TODO: Remove this after making sure it handled in apps
		error.message = req.custom.local.city_is_not_exists;
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const cityCollection = req.custom.db.client().collection('city');
	const cityObj = await cityCollection.findOne({
		_id: ObjectID(data.city_id.toString())
	}).then((c) => c).catch(() => null);

	// TODO: Update 'meesage' to 'city_id' this after making sure it handled in apps
	if (!cityObj) {
		return res.out({
			'message': req.custom.local.city_is_not_exists
		}, status_message.CITY_REQUIRED)
	}

	const countryCollection = req.custom.db.client().collection('country');
	const countryObj = await countryCollection.findOne({
		_id: cityObj.country_id
	}).then((c) => c).catch(() => null);

	const cart = req.custom.authorizationObject.cart || {};
	if (req.custom.authorizationObject.store_id && cityObj && cityObj.store_id && req.custom.authorizationObject.store_id.toString() !== cityObj.store_id.toString()) {

		let prod_ids = [];
		if (Object.keys(cart).length > 0) {
			for (const i of Object.keys(cart)) {
				prod_ids.push(ObjectID(i));
			}
		}

		const prod_collection = req.custom.db.client().collection('product');
		const prods = await prod_collection.find({ "_id": { $in: prod_ids } }, { projection: { _id: 1, prod_n_storeArr: 1 } }).toArray();

		for (const p of Object.keys(cart)) {
			const product = prods.find((i) => i._id.toString() === p.toString());
			if (!product) {
				delete cart[p];
				continue;
			}

			const product_qty = product.prod_n_storeArr.find((i) => i.store_id.toString() === cityObj.store_id.toString());
			if (!product_qty) {
				delete cart[p];
				continue;
			}

			if (cart[p] > product_qty.quantity) {
				cart[p] = product_qty.quantity;
			}

		}

	}

	const row = {
		city_id: data.city_id,
		country_id: cityObj.country_id,
		store_id: cityObj.store_id,
		currency: countryObj.currency,
		language: req.custom.lang,
		cart: cart
	};

	if (req.custom.authorizationObject.member_id) {
		const userCollection = req.custom.db.client().collection('member');
		const userObj = await userCollection.findOne({
			_id: ObjectID(req.custom.authorizationObject.member_id.toString())
		}).then((c) => c).catch(() => { });

		fix_user_data(req, userObj, data.city_id);
	}

	req.custom.cache.set(req.custom.token, row)
		.then((response) => res.out({
			message: req.custom.local.saved_done,
			data: {
				city_id: data.city_id,
				country_id: cityObj.country_id,
				currency: countryObj.currency
			}
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.points2wallet = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);

	const user = await getInfo(req).catch(() => { });

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, status_message.VALIDATION_ERROR);
	}

	if (!req.custom.settings.wallet.user_can_convert_points_to_wallet) {
		return res.out({
			"message": req.custom.local.convert2wallet_closed
		}, status_message.VALIDATION_ERROR);
	}

	let points = user.points;
	let wallet = user.wallet;

	if (points > 100) {
		const tmp_wallet = parseInt(points / 100);
		wallet += tmp_wallet;
		points -= tmp_wallet * 100;
	} else {
		return res.out({
			"message": req.custom.local.no_enough_points
		}, status_message.VALIDATION_ERROR);
	}

	collection.updateOne({
		_id: ObjectID(user._id)
	}, {
		$set: {
			points: points,
			wallet: wallet,
		}
	})
		.then((response) => res.out({
			message: req.custom.local.points2wallet_saved_done,
			points: points,
			wallet: wallet,
		}))
		.catch((error) => res.out({
			'message': error.message
		}, status_message.UNEXPECTED_ERROR));
};

function fix_user_data(req, userObj, city_id) {
	const userCollection = req.custom.db.client().collection('member');
	let points = userObj.points || 0;
	let wallet = userObj.wallet || 0;
	let address = userObj.address;
	address.city_id = ObjectID(city_id.toString());
	address.widget = userObj.address.widget || 'N/A';
	address.street = userObj.address.street || 'N/A';
	address.gada = userObj.address.gada || 'N/A';
	address.house = userObj.address.house || 'N/A';
	address.latitude = userObj.address.latitude || 0;
	address.longitude = userObj.address.longitude || 0;

	userCollection.updateOne({
		_id: userObj._id
	}, {
		$set: {
			address: address,
			points: points,
			wallet: wallet,
		}
	})
		.catch(() => null);
}

function getInfo(req, projection = {}) {
	return new Promise((resolve, reject) => {
		const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
		req.custom.cache.get(token)
			.then((row_token) => {
				if (row_token.member_id) {
					const collection = req.custom.db.client().collection('member');
					collection.findOne({
						_id: ObjectID(row_token.member_id)
					}, projection)
						.then((theuser) => {
							resolve(theuser);
						})
						.catch((err) => reject(err));
				} else {
					resolve(null);
				}
			})
			.catch((err) => reject(err));
	});
}

module.exports.getInfo = getInfo;