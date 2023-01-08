// Load required modules
const status_message = require('../../enums/status_message');

const SITE_ID = "jm3eiadotcom";

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	req.custom.cache.get('settings')
		.then((docs) => {
			if (docs) {
				for (const i of docs) {
					req.custom.settings[i.key] = i.value;
				}
			} else {
				const collection = req.custom.db.client().collection('setting');
				collection.find()
					.toArray(function (err, docs) {
						if (err) {
							return res.out({
								message: err.message
							}, status_message.UNEXPECTED_ERROR);
						}
						req.custom.cache.set('settings', docs, req.custom.config.cache.life_time.data);
						for (const i of docs) {
							req.custom.settings[i.key] = i.value;
						}
					});
			}
			req.custom.settings['site_id'] = SITE_ID;
		}).then(() => next());
};
