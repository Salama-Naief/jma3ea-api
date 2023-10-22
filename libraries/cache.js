'use strict';
const config = require('../config');
const redis = require('redis');
const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    retry_strategy: function (options) {
        if (options.error && options.error.code === "ECONNREFUSED") {
            return new Error("The server refused the connection");
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

client.on('error', function (err) {
    console.error(err);
});

/**
 * Get value
 * @return {Promise}
 */
exports.get = (key) => {
    key = `${config.cache.prefix}_${key}`;
    return new Promise((resolve, reject) => {
        client.get(key, (err, res) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const out = JSON.parse(res);
                    resolve(out);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
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
        } else {
            client.set(key, JSON.stringify(value), (err) => {
                if (err) {
                    reject(err);
                } else {
                    if (expire > 0) {
                        client.expire(key, expire);
                    } else {
                        client.expire(key, 60 * config.cache.life_time.data);
                    }
                    resolve(true);
                }
            });
        }
    });
};

/**
 * Unset value
 * @return {Promise}
 */
exports.unset = (key) => {
    return new Promise((resolve, reject) => {
        if (!key) {
            reject(false);
        } else {
            key = `${config.cache.prefix}_${key}`;
            client.del(key, (err, reply) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(reply === 1);
                }
            });
        }
    });
};