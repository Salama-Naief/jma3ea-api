// Load required modules
const config = require('../config');
const fs = require('fs');

/**
 * Middleware to initialize base and defaults
 */
module.exports = (base_path) => {
	return function fn(req, res, next) {
		req.custom = {};
		req.custom.config = config;
		req.custom.isAuthorized = true;
		req.custom.isProducts = false;
		req.custom.authorizationObject = {};
		req.custom.settings = {};
		const arr_path = req.path.split('/').slice(config.base_url_level);
		req.custom.path_url_arr = arr_path;
		req.custom.class = arr_path[0];
		req.custom.action = arr_path[1] || 'index';

		res.header('X-powered-by', 'Big Store Core');

		const originalModelFile = `modules/${req.custom.class}/model.js`;
		const modelFile = `${base_path}/${originalModelFile}`;

		fs.stat(modelFile, (err, stats) => {
			if (!err && stats.isFile()) {
				req.custom.model = require(modelFile);
				next();
			} else {
				fs.stat(originalModelFile, (err, stats) => {
					if (!err && stats.isFile()) {
						req.custom.model = require(originalModelFile);
					}
					next();
				});
			}
		});
	};
};
