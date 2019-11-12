// Load required modules
const config = require('./config');
const cache = require('./cache');
const database = require('./database');
const enums = require('./enums');
const validateData = require('./validation');
const fs = require('fs');
const qs = require('qs');
const path = require('path');

/**
 * middleware to handle requests and responses
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @return {promise}
 */
module.exports = (req, res, next) => {
	res.out = (results, message = enums.status_message.DATA_LOADED) => {
		res.json(response(results, message));
	};
	return database.connect()
		.then(() => {
			req.custom = {};
			req.custom.config = config;
			req.custom.isAuthorized = true;
			req.custom.isProducts = false;
			req.custom.authorizationObject = {};
			req.custom.model = {};
			req.custom.settings = {};
			req.custom.available_languages = fs.readdirSync(path.resolve('i18n')).map((lng) => lng.replace('.js', ''));
			req.custom.lang = req.custom.available_languages.indexOf(req.headers['language']) > -1 ? req.headers['language'] : req.custom.config.local;
			req.custom.local = require(`../i18n/${req.custom.lang}`);
			let arr_path = req.path.split('/').slice(config.base_url_level);
			req.custom.path_url_arr = arr_path;
			req.custom.class = arr_path[0];
			req.custom.action = arr_path[1] || 'index';
		})
		.then(() => {
			req.custom.cache = cache;
			req.custom.db = database;
		})
		.then(() => checkpolicy(req, res).catch(e => {
			req.custom.isAuthorized = false;
			req.custom.UnauthorizedObject = e;
		}))
		.then(() => loadSettings(req, res).then((rows) => {
			for (const i of rows) {
				req.custom.settings[i.key] = i.value;
			}
		}).catch(e => {}))
		.then(() => {
			// Get sorting rules
			const query_sort = req.query.sort || '';
			const sort = qs.parse(query_sort, {
				allowDots: true
			});
			const model = req.custom.model;
			const model_keys = Object.keys(model);
			req.custom.clean_sort = {};
			if (Object.keys(sort).length > 0) {
				for (let k of model_keys) {
					let sort_val = sort[k];
					if (model[k]['isLang']) {
						k = `${k}.${config.local}`;
					}
					if (sort_val && (['asc', 'desc'].indexOf(sort_val) > -1 || [1, -1].indexOf(parseInt(sort_val)) > -1)) {
						if (sort_val === 'asc') {
							sort_val = 1;
						} else if (sort_val === 'desc') {
							sort_val = -1;
						}
						sort_val = parseInt(sort_val);
						if ([1, -1].indexOf(sort_val) > -1) {
							req.custom.clean_sort[k] = sort_val;
						}
					}
				}
			}
		})
		.then(() => {
			const query_filter = req.query.filter || '';
			const filter = qs.parse(query_filter, {
				allowDots: true
			});
			const model = req.custom.model;
			const model_keys = Object.keys(model);
			req.custom.clean_filter = {};
			if (Object.keys(filter).length > 0) {
				for (let k of model_keys) {
					let filter_val = filter[k];
					if (filter_val) {
						if (model[k]['isLang']) {
							req.custom.clean_filter[`${k}.${config.local}`] = filter_val;
						} else {
							req.custom.clean_filter[k] = filter_val;
						}
					}
				}
			}
		})
		.then(() => {
			req.custom.limit = parseInt(req.query.limit || config.db.limit);
		})
		.then(() => {
			req.custom.skip = req.custom.limit * parseInt(req.query.skip - 1);
			req.custom.skip = parseInt(req.custom.skip) > 0 ? parseInt(req.custom.skip) : 0;
		})
		.then(() => {
			req.custom.getValidData = validateData;
		})

		.then(next)
		.catch((e) => console.log(e));
};
/**
 * check permissions
 * @param {object} req
 * @param {object} res
 */
function checkpolicy(req, res) {
	return new Promise((resolve, reject) => {
		if ((req.custom.class === 'auth' && req.custom.action === 'check' && req.method === 'POST') || req.method === "OPTIONS") {
			resolve(true);
		}

		const local = req.custom.local;
		const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
		if (!token) {
			reject({
				message: local.no_token
			});
		}

		const cache = req.custom.cache;
		cache.get(token)
			.then((row) => {
				const user_agent = req.get('User-Agent') || null;
				if (row /*&& row.userAgent === user_agent*/ ) {
					req.custom.token = token;
					req.custom.authorizationObject = row;
					resolve(true);
				} else {
					reject({
						message: local.failed_auth
					});
				}
			})
			.catch((error) => reject({
				message: local.failed_auth,
				error: error
			}));
	});
}

/**
 * Load Settings
 * @param {object} req
 * @param {object} res
 */
function loadSettings(req, res) {
	return new Promise((resolve, reject) => {
		req.custom.cache.get('settings')
			.then((docs) => {
				if (docs) {
					resolve(docs);
				} else {

					const collection = req.custom.db.client().collection('setting');
					collection.find()
						.toArray(function (err, docs) {
							err ?
								reject({
									message: req.custom.local.no_settings
								}) :
								req.custom.cache.set('settings', docs);
							resolve(docs);
						});

				}
			});
	});
}

function response(results, message = enums.status_message.DATA_LOADED) {
	let code = 200;
	if ([enums.status_message.AUTHORIZED, enums.status_message.CREATED, enums.status_message.DATA_LOADED, enums.status_message.DELETED, enums.status_message.NO_DATA, enums.status_message.UPDATED].indexOf(message) > -1) {
		code = 200;
	} else if ([enums.status_message.UNAUTHENTICATED].indexOf(message) > -1) {
		code = 401;
	} else if ([enums.status_message.FORBIDDEN, enums.status_message.UNAUTHORIZED].indexOf(message) > -1) {
		code = 403;
	} else if ([enums.status_message.NOT_FOUND].indexOf(message) > -1) {
		code = 404;
	} else if ([enums.status_message.VALIDATION_ERROR, enums.status_message.INVALID_APP_AUTHENTICATION, enums.status_message.RESOURCE_EXISTS, enums.status_message.INVALID_USER_AUTHENTICATION, enums.status_message.INVALID_URL_PARAMETER, enums.status_message.CITY_REQUIRED, enums.status_message.UNEXPECTED_ERROR].indexOf(message) > -1) {
		code = 500;
	}
	return {
		success: code === 200,
		status_code: code,
		status_message: message,
		errors: code !== 200 ? results : null,
		results: code === 200 ? results : null,
	};
}