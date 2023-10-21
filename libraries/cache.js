'use strict';
// Load required modules
const config = require('../config');
const redis = require('redis');
const client = redis.createClient({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.password || undefined,
	/* retry_strategy: function (options) {
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
	}, */
	retryStrategy: function (times) {
		const delay = Math.min(times * 50, 2000);
		return delay;
	  },
});

client.on('error', function (err) {
	console.error(err);
});

/**
 * Get value
 * @return {Promise}
 */
exports.get = (key, cb) => {
	key = `${config.cache.prefix}_${key}`;
	return client.get(key).then((res) => {
		if (res) {
		  return JSON.parse(res);
		}
		return null;
	  });
	/* return new Promise((resolve, reject) => {
		client.get(key, (err, res) => {
			if (err) {
				console.log('this is the error');
				reject(err);
			}
			try {
				const out = JSON.parse(res);
				resolve(out);
			} catch (error) {
				reject(error);
			}
		})
	}); */
};

/**
 * Set value
 * @return {Promise}
 */
exports.set = (key, value, expire = 0) => {
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
};

/**
 * Unset value
 * @return {Promise}
 */
exports.unset = (_key) => {
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
};
