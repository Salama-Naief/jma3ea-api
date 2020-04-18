// Settings Controller
const Controller = require('@big_store_core/api/modules/setting/controller');

/**
 * List all settings
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	Controller.list(req, res);
};
