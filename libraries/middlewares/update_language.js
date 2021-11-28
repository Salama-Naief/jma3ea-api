const ObjectID = require('../../types/object_id');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	if (req.custom.authorizationObject && req.custom.lang != req.custom.authorizationObject.language) {
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
