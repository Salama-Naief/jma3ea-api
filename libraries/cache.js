'use strict';
// Load required modules
const config = require('../config');
const redis = require('redis');
const client = redis.createClient({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.password,
	retry_strategy: function (options) {
		if (options.error && options.error.code === "ECONNREFUSED") {
			// End reconnecting on a specific error and flush all commands with
			// a individual error
			return new Error("The server refused the connection");
		}
		if (options.total_retry_time > 1000 * 60 * 60) {
			// End reconnecting after a specific timeout and flush all commands
			// with a individual error
			return new Error("Retry time exhausted");
		}
		if (options.attempt > 10) {
			// End reconnecting with built in error
			return undefined;
		}
		// reconnect after
		return Math.min(options.attempt * 100, 3000);
	},
});

client.on('error', function (err) {
	console.log('Error Redis', err);
});

/**
 * Get value
 * @return {Promise}
 */
exports.get = (key, cb) => {
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
};

/**
 * Set value
 * @return {Promise}
 */
exports.set = (key, value, expire = 0) => {
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
};

/**
 * Unset value
 * @return {Promise}
 */
exports.unset = (_key) => {
	return new Promise((resolve, reject) => {
		if (_key) {
			reject(false);
		}
		client.keys('*', function (err, keys) {
			if (!keys) {
				return false;
			}
			keys.forEach(function (key, pos) {
				if (key.includes(_key)) {
					client.del(key, function (err, o) {
						if (err) { console.log('[Redis.cache.delete]', !err, key); }
					});
				}
			});
		});
	});
};