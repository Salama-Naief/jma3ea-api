// Load required modules
const status_message = require('../enums/status_message');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {

	res.out = (results, message = status_message.DATA_LOADED) => {
		res.json(response(results, message));
		res.end();
	};

	next();
};

function response (results, message = status_message.DATA_LOADED) {
	let code = 200;
	if ([status_message.AUTHORIZED, status_message.CREATED, status_message.DATA_LOADED, status_message.DELETED, status_message.NO_DATA, status_message.UPDATED].indexOf(message) > -1) {
		code = 200;
	} else if ([status_message.UNAUTHENTICATED].indexOf(message) > -1) {
		code = 401;
	} else if ([status_message.FORBIDDEN, status_message.UNAUTHORIZED].indexOf(message) > -1) {
		code = 403;
	} else if ([status_message.NOT_FOUND].indexOf(message) > -1) {
		code = 404;
	} else if ([status_message.VALIDATION_ERROR, status_message.INVALID_APP_AUTHENTICATION, status_message.RESOURCE_EXISTS, status_message.INVALID_USER_AUTHENTICATION, status_message.INVALID_URL_PARAMETER, status_message.CITY_REQUIRED, status_message.UNEXPECTED_ERROR, status_message.APPLICATION_UPGRADE].indexOf(message) > -1) {
		code = 500;
	}
	return {
		success: code === 200,
		status_code: code,
		status_message: message,
		errors: code !== 200 ? results : null,
		results: code === 200 ? results : null,
	};
}
