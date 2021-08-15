// Load required modules
const qs = require('qs');
const common = require('../libraries/common');
const ObjectID = require('mongodb').ObjectID;

/**
 * Middleware for filter
 */
module.exports = (req, res, next) => {
	const query_filter = req.query.filter || '';
	req.custom.clean_filter = {};
	if (!query_filter || !req.custom.model) {
		next();
		return;
	}
	const filter = qs.parse(query_filter, {
		allowDots: true
	});
	const model = Object.assign(req.custom.model);
	const model_keys = model ? Object.keys(model) : [];
	if (Object.keys(filter).length > 0) {
		if (req.method === 'GET' && req.query._id) {
			model._id = {
				type: ObjectID
			};
		}
		for (const k of model_keys) {
			let filter_val = common.parseArabicNumbers(filter[k]);
			if (filter_val) {
				if (model[k].isLang) {
					req.custom.clean_filter[`${k}.${req.custom.config.local}`] = {
						$regex: filter_val
					};
				} else {
					switch (model[k].type) {
					case Number:
						if (Number(filter_val) !== NaN) {
							filter_val = parseInt(filter_val);
						}
						break;
					case Boolean:
						if (['true', 'false'].indexOf(filter_val) > -1) {
							filter_val = filter_val === 'true';
						}
						break;

					case String:
						filter_val = {
							$regex: filter_val.trim()
						};
						break;

					case ObjectID:
						if (ObjectID.isValid(filter_val)) {
							filter_val = ObjectID(filter_val);
						}
						break;

					default:
						break;
					}
					req.custom.clean_filter[k] = filter_val === 'null' ? {
						$eq: null
					} : filter_val;
				}
			}
		}
	}
	next();
};
