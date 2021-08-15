// Load required modules
const status_message = require('../../enums/status_message');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	const api_version = req.custom.config.api_version;
	const mobile_version = req.headers['application-version'] || '0.0.0';
	const platform = req.headers.platform;

	const app_store_url = req.custom.config.mobile.app_store_url;
	const google_play_url = req.custom.config.mobile.google_play_url;

	if (api_version && ['android', 'ios'].indexOf(platform) > -1 && app_store_url && google_play_url && api_version > mobile_version) {
		res.out({
			message: req.custom.local.upgrade_message || "There is new version of application, please update the application.",
			google_play: google_play_url,
			app_store: app_store_url
		}, status_message.APPLICATION_UPGRADE)
		return;
	}

	next();
};
