// Slides Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const enums = require('../../libraries/enums');
const mail = require('../../libraries/mail');
const sha1 = require('sha1');
const md5 = require('md5');
const format = require('string-format')
const auth = require('../auth/controller');
const mail_forgotpassword_view = require("./view/forgotpassword");
const collectionName = 'member';

/**
 * Display profile data
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	getInfo(req).then((decoded) => {
		if (!decoded) {
			return res.out({
				message: req.custom.local.no_data_found
			}, enums.status_message.NO_DATA);
		}
		if (decoded.password) {
			delete decoded.password;
		}
		res.out(decoded);
	}).catch((e) => {
		res.out({
			message: e.message
		}, enums.status_message.UNEXPECTED_ERROR);
	});

};

/**
 * login
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const usercollection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;

	if (!req.body.username || !req.body.password) {
		return res.out({
			message: local.failed_auth_user
		}, enums.status_message.INVALID_USER_AUTHENTICATION);
	}

	usercollection.findOne({
		username: req.body.username,
		password: sha1(md5(req.body.password))
	}).then((theuser) => {
		if (!theuser) {
			return res.out({
				message: local.failed_auth_user
			}, enums.status_message.INVALID_USER_AUTHENTICATION);
		}
		// create a token
		const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';


		if (!ObjectID.isValid(cityid)) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, enums.status_message.CITY_REQUIRED);
		}

		const token = 'u_' + auth.generateToken();
		const data = req.custom.authorizationObject;
		data.member_id = theuser._id;

		req.custom.cache.set(token, data)
			.then(() => {
				res.out({
					token: token
				});
			})
			.catch(() => res.out({
				message: local.failed_create_auth_app
			}, enums.status_message.UNEXPECTED_ERROR));

	}).catch(() => res.out({
		error: local.failed_auth_user
	}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
	const collection = req.custom.db.client().collection('token');
	const where = {
		token: token
	};

	collection.deleteOne(where, function (err, result) {});

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
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/register');
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error && Object.keys(error).length > 0) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	data.password = sha1(md5(data.password));
	collection.insertOne(data)
		.then(async (response) => {
			const mail_data = {
				fullname: data.fullname,
				login_url: '#',
				profile_url: '#',
				site_email: req.custom.settings.email,
				site_name: req.custom.settings.site_name[req.custom.lang],
				site_phone: req.custom.settings.Phone,
				site_url: '#',
				username: data.username
			};

			mail.send_mail(req.custom.settings.site_name[req.custom.lang], data.email,
				`${req.custom.settings['site_name'][req.custom.lang]} :: ${req.custom.local.mail.registerion_subject}`,
				format(req.custom.local.mail.registerion_message, mail_data)).catch(() => null);
			res.out({
				message: req.custom.local.saved_done,
				insertedId: response.insertedId
			});
		})
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/update');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const user = await getInfo().catch(() => {});

	if (!user) {
		return res.out({
			"message": req.custom.local.no_user_found
		}, enums.status_message.VALIDATION_ERROR);
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
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Change password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatepassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/updatepassword');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	let userdecode = {};
	if (!error || (error && !error.old_password)) {
		userdecode = await getInfo(req).catch(() => {});
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
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	data.password = sha1(md5(data.old_password));
	collection.updateOne({
			_id: userdecode._id
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
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Forgot password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.forgotpassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./model/forgotpassword');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const userCollection = req.custom.db.client().collection('member');
	const userObj = await userCollection.findOne({
		email: data.email
	}).then((c) => c).catch(() => {});

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
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Forgot password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.resetpassword = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	req.custom.model = require('./model/resetpassword');
	req.body.reset_hash = req.params.hash;
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const userCollection = req.custom.db.client().collection('member');
	const user = await userCollection.findOne({
		reset_hash: req.params.hash
	}).then((c) => c).catch(() => null);

	if (!user) {
		res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}

	const password = sha1(md5(data.new_password));
	collection.updateOne({
			_id: user._id
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
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Change city
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatecity = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./model/updatecity');
	let {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const cityCollection = req.custom.db.client().collection('city');
	const cityObj = await cityCollection.findOne({
		_id: data.city_id
	}).then((c) => c).catch(() => null);

	if (!cityObj) {
		return res.out({
			'message': req.custom.local.city_is_not_exists
		}, enums.status_message.CITY_REQUIRED)
	}

	const countryCollection = req.custom.db.client().collection('country');
	const countryObj = await countryCollection.findOne({
		_id: cityObj.country_id
	}).then((c) => c).catch(() => null);

	const row = {
		cart: {},
		city_id: data.city_id,
		country_id: cityObj.country_id,
		store_id: cityObj.store_id,
		currency: countryObj.currency,
		language: req.custom.lang
	};

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
		}, enums.status_message.UNEXPECTED_ERROR));
};

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