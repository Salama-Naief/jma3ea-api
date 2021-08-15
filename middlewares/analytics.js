// Load required modules
const ua = require('universal-analytics');

/**
 * Middleware for analytics
 */
module.exports = (req, res, next) => {
	if (req.custom.config.google_analytics_key) {
		const uuid = (req.custom.token ? req.custom.token.replace(/_/g, '-') : 'v-00000000-0000-0000-0000-000000000000').substring(2);
		const visitor = ua(req.custom.config.google_analytics_key, uuid);
		const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
		visitor.set('uip', ip); 
		visitor.pageview(req.path).send();
	}
	next();
};
