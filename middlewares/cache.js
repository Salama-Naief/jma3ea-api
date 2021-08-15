// Load required modules
const cache = require('../libraries/cache');

/**
 * Middleware for caching
 */
module.exports = (req, res, next) => {
	req.custom.cache = cache;
	next();
};
