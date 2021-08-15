// Load required modules
const cache = require('../cache');

/**
 * Middleware for caching
 */
module.exports = (req, res, next) => {
	req.custom.cache = cache;
	next();
};
