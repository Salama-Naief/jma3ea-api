'use strict';
// Load required modules
const config = require('../config');
const Redis = require('ioredis');

// Create a new Redis client instance
const client = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
});

// Handle connection errors
client.on('error', function (err) {
  console.error(err);
});

// Your Redis operations remain mostly the same
exports.get = async (key) => {
  key = `${config.cache.prefix}_${key}`;
  return JSON.parse(await client.get(key));
};

exports.set = (key, value, expire = 0) => {
  key = `${config.cache.prefix}_${key}`;
  return client.set(key, JSON.stringify(value, 'EX', expire)).then((result) => {
    return result === 'OK';
  });
};

exports.unset = (_key) => {
  return client.del(client.keys(`${config.cache.prefix}_${_key}*`)).then((count) => {
    return count > 0;
  });
};
