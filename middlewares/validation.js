// Load required modules
const validateData = require('../libraries/validation');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	req.custom.getValidData = validateData;
	next();
};
