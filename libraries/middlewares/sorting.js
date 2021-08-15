// Load required modules
const qs = require('qs');

/**
 * Middleware for sorting
 */
module.exports = (req, res, next) => {
	const query_sort = req.query.sort || '';
	const sort = qs.parse(query_sort, {
		allowDots: true
	});
	const model = req.custom.model;
	const model_keys = model ? Object.keys(model) : [];
	req.custom.clean_sort = {};
	if (Object.keys(sort).length > 0) {
		for (let k of model_keys) {
			let sort_val = sort[k];
			if (model[k].isLang) {
				k = `${k}.${req.custom.config.local}`;
			}
			if (sort_val && (['asc', 'desc'].indexOf(sort_val) > -1 || [1, -1].indexOf(parseInt(sort_val)) > -1)) {
				if (sort_val === 'asc') {
					sort_val = 1;
				} else if (sort_val === 'desc') {
					sort_val = -1;
				}
				sort_val = parseInt(sort_val);
				if ([1, -1].indexOf(sort_val) > -1) {
					req.custom.clean_sort[k] = sort_val;
				}
			}
		}
	} else {
		req.custom.clean_sort = {
			_id: -1
		};
	}
	next();
};
