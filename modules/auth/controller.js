// Auth Controller

// Load required modules
const bcrypt = require('bcryptjs');
const status_message = require('@big_store_core/base/enums/status_message');
const uuid = require('uuid');


/**
 * Check auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.check = async function (req, res) {
	const collection = req.custom.db.client().collection('application');
	const cache = req.custom.cache;
	const local = req.custom.local;

	if (!req.body.appId || !req.body.appSecret) {

		return res.out({
			message: local.failed_create_auth_app
		}, status_message.INVALID_APP_AUTHENTICATION);

	}

	let appId = req.body.appId;
	let appSecret = req.body.appSecret;

	let where = {
		appId: appId
	};

	const theapp = await collection.findOne(where).catch(() => null);

	if (!theapp) {
		return res.out({
			message: local.failed_auth_user
		}, status_message.UNEXPECTED_ERROR);
	}

	bcrypt.compare(appSecret, theapp.appSecret, function (err, valid) {
		if (err || !valid) {
			return res.out({
				message: local.failed_auth_app
			}, status_message.INVALID_APP_AUTHENTICATION);
		}
		// create a token
		const userAgent = req.get('User-Agent');
		const token = 'v_' + generateToken();

		const data = {
			userAgent: userAgent,
			created: new Date()
		};
		cache.set(token, data)
			.then(() => res.out({
				token: token
			}))
			.catch(() => res.out({
				message: local.failed_create_auth_app
			}, status_message.UNEXPECTED_ERROR));
	});
};

/**
 * Generate token
 * @param {Number} min
 * @param {Number} max
 * @returns {string}
 */
function generateToken() {
	const text = uuid();
	return text.replace(/-/g, '_');
}
module.exports.generateToken = generateToken;