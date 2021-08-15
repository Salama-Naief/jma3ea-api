'use strict'
// Load required modules
const config = require('../config')
const MongoClient = require('mongodb').MongoClient

/**
 * Conection state
 */
const state = {
	db: null
};

/**
 * Connect to mongodb
 * @return {Promise}
 */
exports.connect = () => {
	if (state.db) {
		return Promise.resolve(state.db)
	}
	const url = config.db.url || `mongodb://${config.db.username}:${config.db.password}@localhost:27017/`
	return MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
		.then((client) => {
			state.db = client.db(config.db.name);
			return true
		})
		.catch((e) => e);
}

/**
 * Export database object
 * @return {state.db|nm$_database.state.db}
 */
exports.client = () => {
	return state.db;
}

/**
 * Close opened database connection
 * @return {Promise}
 */
exports.close = () => {
	if (state.db) {
		return state.db.close(() => {
			state.db = null;
		})
	}
}
