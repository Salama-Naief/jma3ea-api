// Load required modules
const validateData = require('../validation');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	req.custom.getValidData = validateData;
	next();
};
