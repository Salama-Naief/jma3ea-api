// Device Controller
const Controller = require('@big_store_core/api/modules/device/controller');

/**
 * List all devices
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
    Controller.list(req, res);
};

/**
 * Add new device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add = function (req, res) {
    req.custom.model = require('./model/add');
    Controller.add(req, res);
};

/**
 * Remove Device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.remove = function (req, res) {
    req.custom.model = require('./model/remove');
    Controller.remove(req, res);
};
