// Slides Controller

// Load required modules
const Controller = require('@big_store_core/api/modules/profile/controller');

/**
 * Display profile data
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = async function (req, res) {
	Controller.me(req, res);
};

/**
 * login
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = async function (req, res) {
	Controller.login(req, res);
};

/**
 * logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = async function (req, res) {
	Controller.logout(req, res);
};


/**
 * Register new user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.register = async function (req, res) {
	Controller.register(req, res);
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res) {
	Controller.update(req, res);
};

/**
 * Change password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatepassword = async function (req, res) {
	Controller.updatepassword(req, res);
};

/**
 * Forgot password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.forgotpassword = async function (req, res) {
	Controller.forgotpassword(req, res);
};

/**
 * Reset password
 * @param {Object} req
 * @param {Object} res
 */
module.exports.resetpassword = async function (req, res) {
	Controller.resetpassword(req, res);
};

/**
 * Change city
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatecity = async function (req, res) {
	Controller.updatecity(req, res);
};

/**
 * Update exists user
 * @param {Object} req
 * @param {Object} res
 */
module.exports.points2wallet = async function (req, res) {
	Controller.points2wallet(req, res);
};

module.exports.getInfo = Controller.getInfo;