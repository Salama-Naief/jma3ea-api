// Auth Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/auth/controller');


/**
 * Check auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.check = async function (req, res) {
	Controller.check(req, res);
};
