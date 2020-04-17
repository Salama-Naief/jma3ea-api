// Load required modules
const status_message = require('@big_store_core/base/enums/status_message');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	if ((req.custom.class === 'auth' && req.custom.action === 'check' && req.method === 'POST') || req.method === 'OPTIONS') {
		next();
		return;
	}

	const local = req.custom.local;
	const token = req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
	if (!token) {
		res.out({
			message: local.no_token
		}, status_message.UNEXPECTED_ERROR)
		return;
	}

	const cache = req.custom.cache;
	cache.get(token)
		.then((row) => {
			// TODO: Fix Agent
			// const user_agent = req.get('User-Agent') || null;
			// row.userAgent === user_agent
			if (row) {
				req.custom.token = token;
				req.custom.authorizationObject = row;
				next();
			} else {
				res.out({
					message: local.failed_auth
				}, status_message.INVALID_APP_AUTHENTICATION);
			}
		})
		.catch((error) => res.out({
			message: local.failed_auth,
			error: error
		}, status_message.UNEXPECTED_ERROR));
};
