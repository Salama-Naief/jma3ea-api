// Settings Controller

/**
 * List all settings
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	res.out(req.custom.settings);
};
