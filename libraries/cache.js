'use strict';
// Load required modules
const config = require('./config');
const redis = require("redis"),
	client = redis.createClient();

client.on("error", function (err) {
	console.log("Error Redis" + err);
});

/**
 * Get value
 * @return {Promise}
 */
exports.get = (key, cb) => {
	key = config.cache.prefix + '_' + key;
	return new Promise((resolve, reject) => {
		client.get(key, (err, res) => {
			if (err) {
				reject(err);
			}
			resolve(JSON.parse(res));
		})
	});
};

/**
 * Set value
 * @return {Promise}
 */
exports.set = (key, value, expire = 0) => {
	key = config.cache.prefix + '_' + key;
	return new Promise((resolve, reject) => {
		if(!key || !value)
		{
			reject(false);
		}
		client.set(key, JSON.stringify(value), (err) => {
			if (err) {
				reject(err);
			}
			if (expire > 0) {
				client.expire(key, expire * 60)
			}
			resolve(true);
		});
	});
};