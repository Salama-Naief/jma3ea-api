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
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Retry time exhausted");
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
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
  if (client.connected) {
    key = `${config.cache.prefix}_${key}`;
    return new Promise((resolve, reject) => {
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
      });
    });
  } else {
    // Handle the case when the connection is closed or not established
    return Promise.reject(new Error('Redis connection is not open.'));
  }
};

/**
 * Set value
 * @return {Promise}
 */
exports.set = (key, value, expire = 0) => {
  if (client.connected) {
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
  } else {
    // Handle the case when the connection is closed or not established
    return Promise.reject(new Error('Redis connection is not open.'));
  }
};

/**
 * Unset value
 * @return {Promise}
 */
exports.unset = (_key) => {
  if (client.connected) {
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
  } else {
    // Handle the case when the connection is closed or not established
    return Promise.reject(new Error('Redis connection is not open.'));
  }
};
