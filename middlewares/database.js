// Load required modules
const database = require('../libraries/database');
const status_message = require('../enums/status_message');

/**
 * Middleware to connect to database and create new instance of database
 */
module.exports = (req, res, next) => {
	database.connect()
		.then(() => {
			req.custom.db = database;
			next();
		})
		.catch((e) =>
			res.out({
				message: e.message
			}, status_message.UNEXPECTED_ERROR));
};
