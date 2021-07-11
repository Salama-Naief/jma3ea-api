// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/profile/controller');

/**
 * Display profile data
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = function (req, res) {
	Controller.me(req, res);
};

/**
 * login
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = function (req, res) {
	Controller.login(req, res);
};

/**
 * logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = function (req, res) {
	Controller.logout(req, res);
};


/**
 * Register new user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.register = function (req, res) {
	Controller.register(req, res);
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = function (req, res) {
	Controller.update(req, res);
};

/**
 * Change password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatepassword = function (req, res) {
	Controller.updatepassword(req, res);
};

/**
 * Forgot password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.forgotpassword = function (req, res) {
	Controller.forgotpassword(req, res);
};

/**
 * Reset password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.resetpassword = function (req, res) {
	Controller.resetpassword(req, res);
};

/**
 * Change city
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatecity = function (req, res) {
	Controller.updatecity(req, res);
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.points2wallet = function (req, res) {
	Controller.points2wallet(req, res);
};

/**
 * Get wallet history
 * @param {Object} req
 * @param {Object} res
 */
module.exports.wallet_history = function (req, res) {
	Controller.wallet_history(req, res);
};

module.exports.getInfo = Controller.getInfo;