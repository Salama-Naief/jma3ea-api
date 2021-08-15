// Load required modules

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {

	req.custom.limit = parseInt(req.query.limit || req.custom.config.db.limit);

	req.custom.skip = req.custom.limit * parseInt(req.query.skip - 1);
	req.custom.skip = parseInt(req.custom.skip) > 0 ? parseInt(req.custom.skip) : 0;

	next();
};