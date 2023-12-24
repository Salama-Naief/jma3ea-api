// Slides Controller

// Load required modules
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const mail = require('../../libraries/mail');
const google = require('../../libraries/external/google');
const common = require('../../libraries/common');
const sha1 = require('sha1');
const md5 = require('md5');
const auth = require('../auth/controller');
const { v4: uuid } = require('uuid');
const mail_forgotpassword_view = require("./view/forgotpassword");
const newpasswordrequest = require("./view/newpasswordrequest");
const mail_register_view = require("./view/register");
const mainController = require("../../libraries/mainController");
const collectionName = 'member';
const sms = require('../../libraries/sms');
const moment = require("moment");

/**
 * Display profile data
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = function (req, res) {
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
		if (!decoded.pro) {
			decoded.pro = {
				active: false,
			}
		}
		res.out(decoded);
	}).catch((e) => {
		res.out({
			message: e.message
		}, status_message.UNEXPECTED_ERROR);
	});

};


/* module.exports.getAuthObject = async (req, res) => {
	const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
	const row = await req.custom.cache.get(token);
	return res.out(row);
} */

/**
 * login
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const usercollection = req.custom.db.collection(collectionName);
	const local = req.custom.local;

	if (!req.body.username || !req.body.password) {
		return res.out({
			message: local.failed_auth_user
		}, status_message.INVALID_USER_AUTHENTICATION);
	}

	usercollection.findOne({
		"$or": [
			{
				email: req.body.username
			},
			{
				username: req.body.username
			},
			{
				mobile: req.body.username.toString()
			}
		],
		password: sha1(md5(req.body.password))
	}).then(async (theuser) => {
		if (!theuser) {
			return res.out({
				message: local.failed_auth_user
			}, status_message.INVALID_USER_AUTHENTICATION);
		}
		// create a token
		const cityid = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

		/* if (!req.custom.config.auto_load_city && !ObjectID.isValid(cityid)) {
			return res.out({
				'message': req.custom.local.choose_city_first
			}, status_message.CITY_REQUIRED);
		} */

		fix_user_data(req, theuser, cityid);
		if (req.body.device_token) { updateDeviceToken(theuser, req.body.device_token, req); }

		const token = 'u_' + auth.generateToken();
		const data = req.custom.authorizationObject;
		data.member_id = theuser._id;
		data.language = theuser.language || req.custom.lang;
		if (theuser.address && theuser.address.city_id) {
			const cityCollection = req.custom.db.collection('city');
			const cityObj = await cityCollection.findOne({
				_id: ObjectID(theuser.address.city_id.toString())
			});
			if (!cityObj) {
				return res.out({
					'message': req.custom.local.city_is_not_exists
				}, status_message.CITY_REQUIRED)
			}

			const countryCollection = req.custom.db.collection('country');
			const countryObj = await countryCollection.findOne({
				_id: cityObj.country_id
			});

			data.city_id = theuser.address.city_id;
			data.city = cityObj;
			data.country_id = cityObj.country_id;
			data.currency = countryObj.currency;
		}

		delete theuser.password;
		theuser.wallet = theuser.wallet && parseFloat(theuser.wallet) > 0 ? parseFloat(theuser.wallet) : 0;
		req.custom.cache.set(token, data, req.custom.config.cache.life_time.token)
			.then(() => {
				res.out({
					token: token,
					user: theuser
				});
			})
			.catch((e) => {
				console.error(req.originalUrl, e)
				res.out({
					message: local.failed_create_auth_app
				}, status_message.UNEXPECTED_ERROR);
			});

	}).catch((e) => {
		console.error(req.originalUrl, e)
		res.out({
			error: local.failed_auth_user
		}, status_message.UNEXPECTED_ERROR)
	});
};

/**
 * logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	req.custom.cache.unset(req.custom.token).catch((e) => console.error(req.originalUrl, e));

	return res.out({
		'message': req.custom.local.logout_done
	});
};


/**
 * Register new user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.register = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.collection(collectionName);
	const registered_mobile_collection = req.custom.db.collection('registered_mobile');
	req.custom.model = req.custom.model || require('./model/register');

	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error && Object.keys(error).length > 0) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			const valid_gmap = google.valid_gmap_address(req, res, req.body.address);

			valid_gmap.then((v_map) => {

				if (!valid_gmap) {
					return;
				}
				registered_mobile_collection.findOne({
					mobile: req.body.mobile,
				}).then((registered_mobile) => {
					data.created = common.getDate();
					data.wallet = req.custom.settings.wallet.register_gift ? parseFloat(req.custom.settings.wallet.register_gift) : 0;
					data.wallet = registered_mobile ? 0 : data.wallet;
					data.points = 50;
					data.convertedPoints = 0;
					data.status = true;

					data.password = sha1(md5(data.password));
					collection.insertOne(data)
						.then((response) => {
							mail.send_mail(req.custom.settings.site_name[req.custom.lang], data.email, data.fullname, req.custom.local.mail.registerion_subject, mail_register_view.mail_register(data, req.custom)).catch((e) => console.error(req.originalUrl, e));
							const point_transactions_collection = req.custom.db.collection('point_transactions');
							point_transactions_collection.insertOne({
								member_id: ObjectID(response.insertedId.toString()),
								points: 50,
								createdAt: common.getDate(),
								expiresAt: moment(common.getDate()).add(9, 'months').toDate(),
								used: false,
								trashed: false
							}).catch((err) => { console.error(req.originalUrl, err) });

							const point_history_collection = req.custom.db.collection('point_history');
							point_history_collection.insertOne({
								member_id: ObjectID(response.insertedId.toString()),
								old_points: 0,
								new_points: 50,
								old_wallet: common.getFixedPrice(0),
								new_wallet: common.getFixedPrice(0),
								notes: "User registration",
								type: "register",
								created: new Date(),
							}).catch((err) => { console.error(req.originalUrl, err) });

							registered_mobile_collection.findOne({
								mobile: req.body.mobile,
							}).then((registered_mobile) => {
								if (registered_mobile) {
									return true;
								}
								return registered_mobile_collection.insertOne({
									mobile: req.body.mobile,
									created: new Date(),
								}).catch(() => null);
							}).then(() => {
								req.body.city_id = req.body.address.city_id;
								updateUserCity(req, res);
								return res.out({ message: req.custom.local.saved_done });
							});

						})
						.catch((e) => {
							console.error(req.originalUrl, e)
							res.out({
								'message': error.message
							}, status_message.UNEXPECTED_ERROR)
						});


				});


			});

		});

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
	const collection = req.custom.db.collection(collectionName);
	req.custom.model = req.custom.model || require('./model/update');
	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			getInfo(req).then((user) => {

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
					}, status_message.UNEXPECTED_ERROR))
					.then(() => {
						const registered_mobile_collection = req.custom.db.collection('registered_mobile');
						registered_mobile_collection.insertOne({
							mobile: req.body.mobile,
							created: new Date(),
						})
							.catch((e) => null)
					});

			}).catch((e) => {
				console.error(req.originalUrl, e)
				res.out({
					'message': error.message
				}, status_message.UNEXPECTED_ERROR)
			});

		});
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
	const collection = req.custom.db.collection(collectionName);
	req.custom.model = req.custom.model || require('./model/updatepassword');

	req.custom.getValidData(req)
		.then(({ data, error }) => {

			let userdecode = {};
			if (error || (error && error.old_password)) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			const user_info = getInfo(req).catch((e) => console.error(req.originalUrl, e));
			user_info.then((userdecode) => {

				userdecode = userdecode || {};

				collection.findOne({
					_id: ObjectID(userdecode._id.toString()),
					password: sha1(md5(req.body.old_password))
				}).then((user) => {

					if (!user) {
						error = error || {};
						error.old_password = 'old password is not correct';
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

				});

			});

		});
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

	req.custom.model = req.custom.model || require('./model/forgotpassword');
	const { data, unset, error } = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	const userCollection = req.custom.db.collection('member');
	var searchColumn = 'email';

	if (req.body?.requestedColumn) {
		searchColumn = req.body.requestedColumn;
	}

	const userObj = await userCollection.findOne({ [searchColumn]: data[searchColumn] });

	if (!userObj) {
		return res.out({ message: req.custom.local.mail.forgotpassword_not_found }, status_message.NOT_FOUND);
	}

	const otpCode = Math.floor(1000 + Math.random() * 9000);

	const reset_hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

	const forgotpassword_data = {
		otp_code: otpCode,
		otp_success: false,
		user: userObj
	};

	const collection = req.custom.db.collection(collectionName);

	const updated = await collection.updateOne({
		_id: userObj._id
	}, {
		$set: {
			otp_code: otpCode,
			otp_success: false,
		}
	}).catch((e) => console.error(req.originalUrl, e));

	if (updated && searchColumn == 'email') {
		mail.send_mail(req.custom.settings.site_name[req.custom.lang], data[searchColumn], userObj.fullname,
			req.custom.local.mail.reset_password_subject,
			newpasswordrequest.newpasswordrequest(forgotpassword_data, req.custom)).catch((e) => console.error(req.originalUrl, e, e.details && e.details.length > 0 ? (e.details[0] && e.details[0].length > 0 ? e.details[0][0] : e.details[0]) : ""));

		return res.out({
			message: req.custom.local.mail.reset_password_otp_sent,
		});
	} else {
		let otpMessage = 'Your OTP: ' + otpCode;
		sms.sendSms(data.mobile, otpMessage);
		return res.out({
			message: req.custom.local.mail.reset_password_otp_sent,
		});
	}

	return res.out({ 'message': req.custom.local.unexpected_error }, status_message.UNEXPECTED_ERROR);

};
/**
 * Verify Reset Password Request
 * @param {Object} req
 * @param {Object} res
 */
module.exports.verifyOtp = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	var data = req.body;

	var columnName = 'email';

	if (!columnName) {
		columnName = 'mobile';
	}

	const userCollection = req.custom.db.collection('member');
	userCollection.findOne({
		"$or": [{
			"email": data.email
		}, {
			"mobile": data.email
		}],
		otp_code: parseInt(data.otp_code)
	}).then((userObj) => {
		if (!userObj) {
			return res.out({
				'message': req.custom.local.user_not_exists
			}, status_message.UNEXPECTED_ERROR);
		}
		userCollection.updateOne({
			_id: userObj._id
		}, {
			$set: {
				otp_success: true
			}
		});

		res.out({
			verified: true,
			message: req.custom.local.mail.reset_password_otp_correct,
		});
	}).catch((e) => {
		console.error(req.originalUrl, e);
		res.out({
			'message': e.message
		}, status_message.UNEXPECTED_ERROR)
	});
};

/**
 * Reset password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.resetpassword = async function (req, res) {
	var otpCode = req.body.otp_code;
	if (req.custom.isAuthorized === false || !otpCode) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	otpCode = parseInt(otpCode);
	const collection = req.custom.db.collection(collectionName);
	req.custom.model = req.custom.model || require('./model/resetpassword');
	req.body.reset_hash = req.params.hash;

	req.custom.getValidData(req).
		then(({ data, error }) => {

			if (error) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			const userCollection = req.custom.db.collection('member');
			userCollection.findOne({
				"$or": [{
					"email": req.body.email
				}, {
					"mobile": req.body.email
				}],
				otp_code: otpCode
			}).then((user) => {

				if (!user) {
					res.out({
						'message': req.custom.local.unexpected_error,
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
						otp_code: 1,
						otp_success: 1,
					},
				})
					.then((response) => res.out({
						message: req.custom.local.password_has_been_updated
					}))
					.catch((e) => {
						console.error(req.originalUrl, e);
						res.out({
							'error': e,
							'message': e.message
						}, status_message.UNEXPECTED_ERROR)
					});


			}).catch((e) => {
				console.error(req.originalUrl, e);
				res.out({
					'message': e.message
				}, status_message.UNEXPECTED_ERROR)
			});

		});
};

/**
 * Change city
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatecity = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.model = req.custom.model || require('./model/updatecity');
	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error) {
				// TODO: Remove this after making sure it handled in apps
				error.message = req.custom.local.city_is_not_exists;
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			const cityCollection = req.custom.db.collection('city');
			cityCollection.findOne({
				_id: ObjectID(data.city_id.toString())
			}).then((cityObj) => {

				// TODO: Update 'meesage' to 'city_id' this after making sure it handled in apps
				if (!cityObj) {
					return res.out({
						'message': req.custom.local.city_is_not_exists
					}, status_message.CITY_REQUIRED)
				}


				const countryCollection = req.custom.db.collection('country');
				countryCollection.findOne({
					_id: cityObj.country_id
				}).then((countryObj) => {

					const set_cache = function (row) {

						req.custom.cache.set(req.custom.token, row, req.custom.config.cache.life_time.token)
							.then((response) => res.out({
								message: req.custom.local.saved_done,
								data: {
									city_id: data.city_id,
									city: cityObj,
									country_id: cityObj.country_id,
									currency: countryObj.currency,
									member_id: row.member_id,
								}
							}))
							.catch((error) => res.out({
								'message': error.message
							}, status_message.UNEXPECTED_ERROR));

					};

					const cart = req.custom.authorizationObject.cart || {};
					if (req.custom.authorizationObject.store_id && cityObj && cityObj.store_id && req.custom.authorizationObject.store_id.toString() !== cityObj.store_id.toString()) {

						let prod_ids = [];
						if (Object.keys(cart).length > 0) {
							for (const i of Object.keys(cart)) {
								prod_ids.push(ObjectID(i));
							}
						}

						const prod_collection = req.custom.db.collection('product');
						prod_collection.aggregate([
							{ $match: { "_id": { $in: prod_ids } } },
							{
								$lookup: {
									from: 'supplier',
									localField: 'supplier_id',
									foreignField: '_id',
									as: 'supplier'
								}
							},
							{
								$project: {
									_id: 1,
									prod_n_storeArr: 1,
									supplier_id: 1,
									supplier: { $arrayElemAt: ['$supplier', 0] }
								}
							}
						]).
							toArray((e, prods) => {
								if (e) {
									console.error(req.originalUrl, e);
									return res.out({
										'message': e.message
									}, status_message.UNEXPECTED_ERROR)
								}

								for (const p of Object.keys(cart)) {
									const product = prods.find((i) => i._id.toString() === p.toString());
									if (!product || (product.supplier && product.supplier.is_external)) {
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


								const row = req.custom.authorizationObject;

								row.city_id = data.city_id;
								row.country_id = cityObj.country_id;
								row.store_id = cityObj.store_id;
								row.currency = countryObj.currency;
								row.language = req.custom.lang;
								row.cart = cart;
								row.member_id = req.custom.authorizationObject.member_id;

								if (row.member_id) {
									const userCollection = req.custom.db.collection('member');
									userCollection.findOne({
										_id: ObjectID(row.member_id.toString())
									}).then((userObj) => {
										row.member_id = userObj._id.toString();
										set_cache(row);
										fix_user_data(req, userObj, data.city_id);
									}).catch((e) => console.error(req.originalUrl, e));
								} else {
									set_cache(row);
								}


							});

					} else {
						set_cache({
							city_id: data.city_id,
							country_id: cityObj.country_id,
							store_id: cityObj.store_id || ObjectID("5d3827c683545d0366ac4285"),
							currency: countryObj.currency,
							language: req.custom.lang,
							cart: cart,
							member_id: req.custom.authorizationObject.member_id,
						});
					}


				}).catch((error) => res.out({
					'message': error.message
				}, status_message.UNEXPECTED_ERROR));


			}).catch((error) => res.out({
				'message': error.message
			}, status_message.UNEXPECTED_ERROR));

		});
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
	const collection = req.custom.db.collection(collectionName);

	req.custom.model = req.custom.model || require('./model/points2wallet');

	req.custom.getValidData(req)
		.then(({ data, error }) => {

			if (error && Object.keys(error).length > 0) {
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			getInfo(req).then((user) => {

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

				const points_2_wallet_values = {
					"100": common.getFixedPrice(1),
					"200": common.getFixedPrice(4),
					"300": common.getFixedPrice(8),
					"400": common.getFixedPrice(12),
					"500": common.getFixedPrice(20),
					"800": common.getFixedPrice(40),
					"1000": common.getFixedPrice(80),
				};

				if (Object.keys(points_2_wallet_values).indexOf(req.body.points.toString()) < 0) {
					return res.out({
						"message": req.custom.local.point_not_valid
					}, status_message.VALIDATION_ERROR);
				}

				let points = parseFloat(user.points);
				let wallet = parseFloat(user.wallet);
				let convertedPoints = parseInt(user.convertedPoints);

				const points_to_wallet = parseFloat(points_2_wallet_values[req.body.points.toString()]);
				if (points > parseFloat(req.body.points)) {
					wallet += points_to_wallet;
					points -= parseFloat(req.body.points);
					convertedPoints += parseInt(req.body.points);
				} else {
					return res.out({
						"message": req.custom.local.no_enough_points
					}, status_message.VALIDATION_ERROR);
				}

				points = parseFloat(points);
				wallet = common.getFixedPrice(wallet);
				user.wallet = common.getFixedPrice(user.wallet);

				collection.updateOne({
					_id: ObjectID(user._id.toString())
				}, {
					$set: {
						points,
						convertedPoints,
						wallet,
					}
				})
					.then((response) => {
						const point_history_collection = req.custom.db.collection('point_history');
						const point_data = {
							"member_id": ObjectID(user._id.toString()),
							"old_points": user.points,
							"new_points": points,
							"old_wallet": user.wallet,
							"new_wallet": wallet,
							"type": "converted",
							"created": new Date(),
						};
						return point_history_collection.insertOne(point_data);
					})
					.then((response) => {
						const wallet_history_collection = req.custom.db.collection('wallet_history');
						const wallet_data = {
							"member_id": ObjectID(user._id.toString()),
							"old_wallet": user.wallet,
							"new_wallet": wallet,
							"type": "converted",
							"notes": `Converted points to wallet and Update wallet from ${user.wallet} to ${wallet}`,
							"created": new Date(),
						};
						wallet_history_collection.insertOne(wallet_data).then((inserted) => res.out({
							message: req.custom.local.points2wallet_saved_done,
							points: points,
							wallet: wallet,
						}, status_message.UPDATED));
					})
					.catch((e) => {
						console.error(req.originalUrl, e);
						res.out({
							'message': e.message
						}, status_message.UNEXPECTED_ERROR)
					});


			}).catch((e) => {
				console.error(req.originalUrl, e);
				res.out({
					'message': e.message
				}, status_message.UNEXPECTED_ERROR);
			});

		});
};

module.exports.chargeWallet = async function (req, res) {
	try {
		if (req.custom.isAuthorized === false) {
			return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
		}

		const only_validation = req.query.validation !== undefined;

		// Get the current user profile
		const profile = require('../profile/controller');
		let user_info = await profile.getInfo(req, {
			_id: 1,
			fullname: 1,
			email: 1,
			mobile: 1,
			address: 1,
			addresses: 1,
			points: 1,
			wallet: 1,
			device_token: 1,
		}).catch((e) => console.error(req.originalUrl, e));

		if (user_info) {
			req.body.user_data = user_info;
		}

		let hash = uuid().replace(/-/g, '');

		if (only_validation && !req.body.hash) {
			req.body.hash = hash;

			req.custom.authorizationObject.hash = hash;
			await req.custom.cache.set(req.custom.token, req.custom.authorizationObject, req.custom.config.cache.life_time.token);

		}


		// Validate and sanitize inputs
		req.custom.model = req.custom.model || require('./model/charge_wallet');
		let {
			data,
			error
		} = await req.custom.getValidData(req);

		if (error) {
			return res.out(error, status_message.VALIDATION_ERROR);
		}

		if (only_validation) {
			return res.out({
				message: true,
				hash: hash,
			});
		}

		if (user_info) {
			data.user_data = user_info;
		}

		if (!data.hash) {
			save_failed_payment(req, !data.hash ? 'NO_HASH' : 'HASH_NOT_VALID');
			return res.out({
				message: req.custom.local.hash_error
			}, status_message.VALIDATION_ERROR);
		}

		// Validate Knet payment details
		// TODO: Fix checking track id && req.body.hash != req.body.payment_details.trackid
		if (req.body.payment_method == 'knet' && req.body.payment_details && !req.body.payment_details.trackid) {
			save_failed_payment(req, 'TRACK_ID_NOT_VALID');
			return res.out({
				message: req.custom.local.hash_error
			}, status_message.VALIDATION_ERROR);
		}

		let wallet_charge_value = data.amount ? parseFloat(data.amount) : 0;
		if (req.body.payment_method == 'knet' && req.body.payment_details.amt) {
			wallet_charge_value = parseFloat(req.body.payment_details.amt);
		}
		const new_wallet = common.getFixedPrice(parseFloat(user_info.wallet) + parseFloat(wallet_charge_value));
		user_info.wallet = common.getFixedPrice(user_info.wallet || 0);
		const wallet_data = {
			"member_id": ObjectID(data.user_data._id.toString()),
			"old_wallet": user_info.wallet,
			"new_wallet": new_wallet,
			"type": "purchased",
			"notes": `Wallet charged from ${user_info.wallet} to ${new_wallet}`,
			"created": new Date(),
		};
		const wallet_history_collection = req.custom.db.collection('wallet_history');
		await wallet_history_collection.insertOne(wallet_data);

		const member_collection = req.custom.db.collection('member');
		await member_collection.updateOne({
			_id: ObjectID(data.user_data._id.toString())
		}, {
			$set: { wallet: new_wallet }
		}).catch((e) => console.error(req.originalUrl, e))


		res.out({ ...wallet_data, total: data.amount });
	} catch (e) {
		console.error(req.originalUrl, e);
		return res.out({
			'message': e.message
		}, status_message.UNEXPECTED_ERROR);
	}
};


module.exports.getTheMonthShipping = async function (req, res) {
	try {
		if (req.custom.isAuthorized === false) {
			return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
		}

		if (!req.custom.settings.orders.jm3eia_pro || !req.custom.settings.orders.jm3eia_pro.allow) {
			return res.out({ message: 'Free month shipping is disabled' }, status_message.UNEXPECTED_ERROR);
		}

		const only_validation = req.query.validation !== undefined;

		// Get the current user profile
		const profile = require('../profile/controller');
		let user_info = await profile.getInfo(req, {
			_id: 1,
			fullname: 1,
			email: 1,
			mobile: 1,
			address: 1,
			addresses: 1,
			points: 1,
			wallet: 1,
			device_token: 1,
		}).catch((e) => console.error(req.originalUrl, e));

		if (user_info) {
			req.body.user_data = user_info;
		}

		let hash = uuid().replace(/-/g, '');

		if (only_validation && !req.body.hash) {
			req.body.hash = hash;
			req.custom.authorizationObject.hash = hash;
			await req.custom.cache.set(req.custom.token, req.custom.authorizationObject, req.custom.config.cache.life_time.token);
		}


		// Validate and sanitize inputs
		req.custom.model = req.custom.model || require('./model/pro');
		let {
			data,
			error
		} = await req.custom.getValidData(req);

		if (error) {
			return res.out(error, status_message.VALIDATION_ERROR);
		}

		if (only_validation) {
			return res.out({
				message: true,
				hash: hash,
			});
		}

		if (user_info) {
			data.user_data = user_info;
		}

		if (!data.hash) {
			save_failed_payment(req, !data.hash ? 'NO_HASH' : 'HASH_NOT_VALID');
			return res.out({
				message: req.custom.local.hash_error
			}, status_message.VALIDATION_ERROR);
		}


		if (req.body.payment_method == 'knet' && req.body.payment_details && !req.body.payment_details.trackid) {
			save_failed_payment(req, 'TRACK_ID_NOT_VALID');
			return res.out({
				message: req.custom.local.hash_error
			}, status_message.VALIDATION_ERROR);
		}


		let amount = data.amount ? parseFloat(data.amount) : 0;
		if (req.body.payment_method == 'knet' && req.body.payment_details.amt) {
			amount = parseFloat(req.body.payment_details.amt);
		}


		if (parseFloat(req.custom.settings.orders.jm3eia_pro.shipping_cost) !== amount) {
			return res.out({ message: 'The amount you paid is not equal to the month shipping cost' }, status_message.UNEXPECTED_ERROR);
		}

		const startDate = new Date();
		const endDate = new Date();
		endDate.setMonth(endDate.getMonth() + 1);

		const member_collection = req.custom.db.collection('member');
		await member_collection.updateOne({
			_id: ObjectID(data.user_data._id.toString())
		}, {
			$set: {
				pro: {
					active: true,
					startDate,
					endDate
				}
			}
		}).catch((e) => console.error(req.originalUrl, e))


		res.out({});
	} catch (e) {
		console.error(req.originalUrl, e);
		return res.out({
			'message': e.message
		}, status_message.UNEXPECTED_ERROR);
	}
};

module.exports.sendToWallet = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const profile = require('../profile/controller');
	let user_info = await profile.getInfo(req, {
		_id: 1,
		fullname: 1,
		email: 1,
		mobile: 1,
		address: 1,
		addresses: 1,
		points: 1,
		wallet: 1,
		device_token: 1,
	}).catch((e) => console.error(req.originalUrl, e));

	if (!user_info) {
		return res.out({
			message: false
		}, status_message.UNEXPECTED_ERROR)
	}

	req.body.user_data = user_info;

	req.custom.model = req.custom.model || require('./model/send_to_wallet');
	let {
		data,
		error
	} = await req.custom.getValidData(req);

	if (error) {
		return res.out(error, status_message.VALIDATION_ERROR);
	}

	if (user_info) {
		data.user_data = user_info;
	}

	if (user_info && user_info.mobile && user_info.mobile === data.mobile) {
		return res.out({
			message: false
		}, status_message.UNEXPECTED_ERROR)
	}

	const sender_wallet = user_info && user_info.wallet ? parseFloat(user_info.wallet) : 0;
	const amount = parseFloat(data.amount);
	const new_sender_wallet = common.getFixedPrice(sender_wallet - amount);

	if (amount > sender_wallet) {
		save_failed_payment(req, 'WALLET_NOT_ENOUGH');
		return res.out({
			message: req.custom.local.no_enough_wallet
		}, status_message.VALIDATION_ERROR);
	}

	const member_collection = req.custom.db.collection('member');

	const receiver = await member_collection.findOne({ mobile: data.mobile }).catch((e) => console.error(req.originalUrl, e));
	if (!receiver) {
		// No user found with this mobile
		return res.out({
			message: req.custom.local.receiver_not_found
		}, status_message.UNEXPECTED_ERROR);
	}

	const receiver_wallet = receiver.wallet ? parseFloat(receiver.wallet) : 0;

	const new_receiver_wallet = common.getFixedPrice(receiver_wallet + amount);

	user_info.wallet = common.getFixedPrice(user_info.wallet);
	const sender_wallet_data = {
		"member_id": ObjectID(data.user_data._id.toString()),
		"old_wallet": user_info.wallet,
		"new_wallet": new_sender_wallet,
		"type": "sent",
		"notes": `Sent ${amount} to ${data.mobile}, and your wallet changed from ${user_info.wallet} to ${new_sender_wallet}`,
		"created": new Date(),
	};

	const receiver_wallet_data = {
		"member_id": ObjectID(receiver._id.toString()),
		"old_wallet": common.getFixedPrice(receiver.wallet),
		"new_wallet": new_receiver_wallet,
		"type": "received",
		"notes": `Received ${amount} from ${user_info.fullname}, and your wallet changed from ${receiver.wallet} to ${new_receiver_wallet}`,
		"created": new Date(),
	};

	const wallet_history_collection = req.custom.db.collection('wallet_history');
	await wallet_history_collection.insertOne(sender_wallet_data);
	await wallet_history_collection.insertOne(receiver_wallet_data);

	await member_collection.updateOne({
		_id: ObjectID(data.user_data._id.toString())
	}, {
		$set: { wallet: new_sender_wallet }
	}).catch((e) => console.error(req.originalUrl, e));

	await member_collection.updateOne({
		_id: ObjectID(receiver._id.toString())
	}, {
		$set: { wallet: new_receiver_wallet }
	}).catch((e) => console.error(req.originalUrl, e));

	res.out(sender_wallet_data);

};

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.wallet_history = function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.clean_filter = req.custom.clean_filter || {};
	req.custom.clean_filter['member_id'] = ObjectID(req.custom.authorizationObject.member_id);
	req.custom.all_status = true;
	req.custom.clean_sort = { "_id": -1 };
	mainController.list(req, res, 'wallet_history', {
		'_id': 1,
		"old_wallet": 1,
		"new_wallet": 1,
		"notes": 1,
		"created": 1,
	});
};

module.exports.list_points = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}
	req.custom.clean_filter = req.custom.clean_filter || {};
	req.custom.clean_filter['member_id'] = ObjectID(req.custom.authorizationObject.member_id);
	req.custom.all_status = true;
	req.custom.clean_sort = { "created": -1 };
	if (req.query.type) req.custom.clean_filter['type'] = req.query.type;
	mainController.list(req, res, 'point_history', {
		'_id': 1,
		"old_points": 1,
		"new_points": 1,
		"type": 1,
		"notes": 1,
		"created": 1,
	});
}

module.exports.delete = async function (req, res) {
	if (req.custom.isAuthorized === false || !req.custom.authorizationObject.member_id) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	}

	const collection = req.custom.db.collection(collectionName);
	const userId = ObjectID(req.custom.authorizationObject.member_id);
	collection.deleteOne({ _id: userId }).then(response => {
		if (response.deletedCount > 0) {
			req.custom.cache.unset(req.custom.token).catch((e) => console.error(req.originalUrl, e));
			return res.out({ message: req.custom.local.account_deleted }, status_message.DELETED);
		} else {
			return res.out({ message: req.custom.local.no_user_found }, status_message.VALIDATION_ERROR);
		}
	}).catch((error) => res.out({
		'message': error.message
	}, status_message.UNEXPECTED_ERROR));
}

function fix_user_data(req, userObj, city_id) {
	const userCollection = req.custom.db.collection('member');
	let language = userObj.language || req.custom.lang;
	let points = parseFloat(userObj.points || 0);
	let wallet = userObj.wallet || 0;
	let address = userObj.address || {};

	address.city_id = address.city_id && ObjectID.isValid(address.city_id.toString()) ? ObjectID(address.city_id.toString()) : (!req.custom.config.auto_load_city && city_id && ObjectID.isValid(city_id.toString()) ? ObjectID(city_id.toString()) : null);

	//address.city_id = !req.custom.config.auto_load_city && ObjectID.isValid(city_id.toString()) ? ObjectID(city_id.toString()) : null;

	address.widget = address.widget || 'N/A';
	address.street = address.street || 'N/A';
	address.gada = address.gada || 'N/A';
	address.house = address.house || 'N/A';
	address.apartment_number = address.apartment_number || 'N/A';
	address.floor = address.floor || 'N/A';
	address.latitude = address.latitude || 0;
	address.longitude = address.longitude || 0;

	userCollection.updateOne({
		_id: userObj._id
	}, {
		$set: {
			address: address,
			language: language,
			points: points,
			wallet: wallet,
		}
	})
		.catch((e) => console.error(req.originalUrl, e));
}

function getInfo(req, projection = {}) {
	return new Promise((resolve, reject) => {
		const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
		req.custom.cache.get(token)
			.then((row_token) => {
				if (row_token.member_id) {
					const collection = req.custom.db.collection('member');
					collection.findOne({
						_id: ObjectID(row_token.member_id)
					}, projection)
						.then((theuser) => {
							if (theuser)
								theuser.wallet = theuser && theuser.wallet && parseFloat(theuser.wallet) > 0 ? parseFloat(theuser.wallet) : 0;
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

function updateDeviceToken(user, device_token, req) {
	const collection = req.custom.db.collection(collectionName);
	return collection.updateMany({
		'device_token': device_token,
	}, {
		$set: {
			'device_token': null,
		}
	}).then(() => {
		return collection.updateOne({
			_id: ObjectID(user._id)
		}, {
			$set: {
				'device_token': device_token
			}
		});
	});
}

function save_failed_payment(req, reason = null) {
	const failed_payment_collection = req.custom.db.collection('failed_payment');
	req.body.reason = reason;
	const data = req.body;
	data.created = common.getDate();
	failed_payment_collection.insertOne(data)
		.catch((error) => {
			return {
				success: false,
				message: error.message
			}
		});
}

function updateUserCity(req, res) {
	req.custom.model = require('./model/updatecity');
	req.custom.getValidData(req).
		then(({ data, error }) => {
			if (error) {
				// TODO: Remove this after making sure it handled in apps
				error.message = req.custom.local.city_is_not_exists;
				return res.out(error, status_message.VALIDATION_ERROR);
			}

			const cityCollection = req.custom.db.collection('city');
			cityCollection.findOne({
				_id: ObjectID(data.city_id.toString())
			}).then((cityObj) => {

				// TODO: Update 'meesage' to 'city_id' this after making sure it handled in apps
				if (!cityObj) {
					return res.out({
						'message': req.custom.local.city_is_not_exists
					}, status_message.CITY_REQUIRED)
				}


				const countryCollection = req.custom.db.collection('country');
				countryCollection.findOne({
					_id: cityObj.country_id
				}).then((countryObj) => {

					const set_cache = function (row) {

						req.custom.cache.set(req.custom.token, row, req.custom.config.cache.life_time.token)
							.then((response) => ({
								city_id: data.city_id,
								city: cityObj,
								country_id: cityObj.country_id,
								currency: countryObj.currency,
								member_id: row.member_id,
							}))
							.catch((error) => res.out({
								'message': error.message
							}, status_message.UNEXPECTED_ERROR));

					};

					const cart = req.custom.authorizationObject.cart || {};
					if (req.custom.authorizationObject.store_id && cityObj && cityObj.store_id && req.custom.authorizationObject.store_id.toString() !== cityObj.store_id.toString()) {

						let prod_ids = [];
						if (Object.keys(cart).length > 0) {
							for (const i of Object.keys(cart)) {
								prod_ids.push(ObjectID(i));
							}
						}

						const prod_collection = req.custom.db.collection('product');
						prod_collection.aggregate([
							{ $match: { "_id": { $in: prod_ids } } },
							{
								$lookup: {
									from: 'supplier',
									localField: 'supplier_id',
									foreignField: '_id',
									as: 'supplier'
								}
							},
							{
								$project: {
									_id: 1,
									prod_n_storeArr: 1,
									supplier_id: 1,
									supplier: { $arrayElemAt: ['$supplier', 0] }
								}
							}
						]).
							toArray((e, prods) => {
								if (e) {
									console.error(req.originalUrl, e);
									return res.out({
										'message': e.message
									}, status_message.UNEXPECTED_ERROR)
								}

								for (const p of Object.keys(cart)) {
									const product = prods.find((i) => i._id.toString() === p.toString());
									if (!product || (product.supplier && product.supplier.is_external)) {
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


								const row = req.custom.authorizationObject;

								row.city_id = data.city_id;
								row.country_id = cityObj.country_id;
								row.store_id = cityObj.store_id;
								row.currency = countryObj.currency;
								row.language = req.custom.lang;
								row.cart = {};
								row.member_id = req.custom.authorizationObject.member_id;

								if (row.member_id) {
									const userCollection = req.custom.db.collection('member');
									userCollection.findOne({
										_id: ObjectID(row.member_id.toString())
									}).then((userObj) => {
										row.member_id = userObj._id.toString();
										set_cache(row);
										fix_user_data(req, userObj, data.city_id);
									}).catch((e) => console.error(req.originalUrl, e));
								} else {
									set_cache(row);
								}


							});

					} else {
						set_cache({
							city_id: data.city_id,
							country_id: cityObj.country_id,
							store_id: cityObj.store_id,
							currency: countryObj.currency,
							language: req.custom.lang,
							cart: {},
							member_id: req.custom.authorizationObject.member_id,
						});
					}


				}).catch((error) => res.out({
					'message': error.message
				}, status_message.UNEXPECTED_ERROR));


			}).catch((error) => res.out({
				'message': error.message
			}, status_message.UNEXPECTED_ERROR));

		});
}

module.exports.getInfo = getInfo;
