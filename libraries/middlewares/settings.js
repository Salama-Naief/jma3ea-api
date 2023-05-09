// Load required modules
const status_message = require('../../enums/status_message');

const SITE_ID = "Jm3eia";

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
				req.custom.settings['site_id'] = req.custom.settings['site_name']['en'] || SITE_ID;

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
						req.custom.settings['site_id'] = req.custom.settings['site_name']['en'] || SITE_ID;
					});
			}
			if (req.query.isVIP == 'true') {
				req.custom.isVIP = true;
				if (req.custom.settings.orders.vip_min_value)
					req.custom.settings.orders.min_value = req.custom.settings.orders.vip_min_value;

				if (req.custom.settings.orders.vip_min_delivery_time)
					req.custom.settings.orders.min_delivery_time = req.custom.settings.orders.vip_min_delivery_time;
			}


		}).then(() => next());
};
