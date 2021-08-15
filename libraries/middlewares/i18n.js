// Load required modules
const fs = require('fs');
const path = require('path');

/**
 * Middleware for localization
 */
module.exports = (i18n_folder = null) => {
	return function fn(req, res, next) {

		fs.readdir(path.resolve('i18n'), (err, files) => {

			req.custom.available_languages = files.map((lng) => lng.replace('.js', ''));
			req.custom.lang = req.custom.available_languages.indexOf(req.headers.language) > -1 ? req.headers.language : req.custom.config.local;
			req.custom.local = require((`../i18n/${req.custom.lang}`));

			if (i18n_folder) {
				req.custom.local = { ...req.custom.local, ...require(`${i18n_folder}/${req.custom.lang}`) };
			}

			next();
		});
	}
};
