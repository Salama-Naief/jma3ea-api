// Load required modules
const status_message = require('../../enums/status_message');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	if (req.custom.authorizationObject.user && req.custom.lang != req.custom.authorizationObject.user.language) {
		const collection = req.custom.db.client().collection('member');
		const data = {
			language: req.custom.lang
		};
		collection.updateOne({
			_id: ObjectID(req.custom.authorizationObject.member_id.toString()),
		}, {
			$set: data
		}).then(() => {
			next();
		});
	} else {
		next();
	}
};
