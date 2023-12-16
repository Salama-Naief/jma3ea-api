'use strict';
// Load required modules
const config = require('../config');
var client = null;

module.exports = function (_client) {
	return {
		init: function () {
			console.log('Connected successfully to redis');
			client = _client;
		},
		get: (key, cb) => {
			key = `${config.cache.prefix}_${key}`;
			return new Promise((resolve, reject) => {
				client.get(key, (err, res) => {
					if (err) {
						reject(err);
					}
					try {
						const out = JSON.parse(res);
						resolve(out);
					} catch (error) {
						reject(error);
					}
				})
			});
		},
		set: (key, value, expire = 0) => {
			key = `${config.cache.prefix}_${key}`;
			return new Promise((resolve, reject) => {
				if (!key || !value) {
					reject(false);
				}
				client.set(key, JSON.stringify(value), (err) => {
					if (err) {
						reject(err);
					}
					if (expire > 0) {
						client.expire(key, expire * 60 * 60);
					} else {
						client.expire(key, 60 * 60 * config.cache.life_time.data);
					}
					resolve(true);
				});
			});
		},
		unset: (_key) => {
			return new Promise((resolve, reject) => {
				if (!_key) {
					reject(false);
				}
				client.keys('*', function (err, keys) {
					if (!keys) {
						return false;
					}
					keys.forEach(function (key, pos) {
						if (key.includes(_key) && key.includes(config.cache.prefix)) {
							client.del(key, function (err, o) {
								if (err) {
									reject(err);
								}
								resolve(true);

							});
						}
					});
				});
			});
		},
	};
};

