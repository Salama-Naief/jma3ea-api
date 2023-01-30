// Load required modules
const moment = require('moment');
const Decimal = require('mongodb').Decimal128;
const ObjectID = require("../types/object_id");

const parseArabicNumbers = function (str) {
	return str ? (str.toString().replace(/[٠١٢٣٤٥٦٧٨٩]/g, function (d) {
		return d.charCodeAt(0) - 1632;
	}).replace(/[۰۱۲۳۴۵۶۷۸۹]/g, function (d) {
		return d.charCodeAt(0) - 1776;
	})).toString() : null;
}
module.exports.parseArabicNumbers = parseArabicNumbers;

module.exports.getRoundedPrice = function (price) {
	return price > 0 ? (Math.ceil(parseFloat(parseArabicNumbers(price)) * 200) / 200).toFixed(3) : '0.000';
}

module.exports.getFixedPrice = function (price) {
	return parseFloat(price || 0) ? parseFloat(parseArabicNumbers(price)).toFixed(3) : '0.000';
}

module.exports.getDecimalPrice = function (price) {
	return Decimal.fromString(price);
}

module.exports.getDate = function (date = null, local = 'en') {
	moment.updateLocale(local, {});
	return new Date(date ? moment(date).add(parseInt(process.env.DATE_UTC), 'hours') : moment().add(parseInt(process.env.DATE_UTC), 'hours'));
}

module.exports.group_products_by_suppliers = (products, req) => {
	return products.reduce((prod, curr) => {
		curr.supplier_id = curr.supplier_id || req.custom.settings.site_name[req.custom.lang];
		prod[curr.supplier_id] = prod[curr.supplier_id] || [];
		prod[curr.supplier_id].push(curr);
		return prod;
	}, {});
}

module.exports.begins_with_similar_alif_letters = (text) => {
	const firstLetter = text.charAt(0);
	const repeatables = ['ا', 'أ', 'إ', 'آ'];
	for (let index = 0; index < repeatables.length; index++) {
		const repeatable = repeatables[index];
		if (firstLetter == repeatable) {
			return true;
		}
	}
	return false;
}

module.exports.transform_word_begins_with_alif_letter = (text) => {
	const firstLetter = text.charAt(0);
	const repeatables = ['ا', 'أ', 'إ', 'آ'];
	let word_without_first_alif = text.substring(1);
	let words = [];
	for (let index = 0; index < repeatables.length; index++) {
		const repeatable = repeatables[index];
		words.push(
			repeatable + word_without_first_alif
		);
	}
	return words;
}



module.exports.filter_internal_suppliers_by_city = async function (req) {
	try {
		if (req.custom.isProducts != true) {
			return req.custom.clean_filter;
		}

		const cache = req.custom.cache;
		const cache_key = `supplier_all_solid`;
		all_suppliers = await cache.get(cache_key).catch(() => null);
		if (true) {
			const supplier_collection = req.custom.db.client().collection('supplier');
			all_suppliers = await supplier_collection.find({}).toArray() || [];
			if (all_suppliers) {
				cache.set(cache_key, all_suppliers, req.custom.config.cache.life_time).catch(() => null);
			}
		}

		const city_id = req.custom.authorizationObject && req.custom.authorizationObject.city_id ? req.custom.authorizationObject.city_id.toString() : '';

		if (all_suppliers.length > 0) {
			const internalSuppliersIds = all_suppliers.filter(sup => {
				if (!sup.is_external || (sup.cities && sup.cities.findIndex(c => c.toString() == city_id.toString()) > -1 && sup.working_times && sup.working_times[moment().format('d')].from <= new Date().getHours() && sup.working_times[moment().format('d')].to >= new Date().getHours())) {
					return sup;
				}
			}).map(s => {
				if (s._id && ObjectID.isValid(s._id)) {
					return new ObjectID(s._id);
				}
			});

			if (req.custom.clean_filter.hasOwnProperty('$or')) {
				if (req.custom.clean_filter.hasOwnProperty('$and')) {
					req.custom.clean_filter['$and'].push({
						'$or': [
							{ "supplier_id": { $exists: false } },
							{
								"supplier_id": {
									$in: internalSuppliersIds
								}
							},
						]
					});
				} else {
					req.custom.clean_filter['$and'] = [{ '$or': req.custom.clean_filter['$or'] }, {
						'$or': [
							{ "supplier_id": { $exists: false } },
							{
								"supplier_id": {
									$in: internalSuppliersIds
								}
							},
						]
					}];
					delete req.custom.clean_filter['$or'];
				}
			} else {
				req.custom.clean_filter['$or'] = [
					{ "supplier_id": { $exists: false } },
					{
						"supplier_id": {
							$in: internalSuppliersIds
						}
					},
				]
			}

		}

		return req.custom.clean_filter;
	} catch (err) {
		console.log('ERROR: ', err);
		return req.custom.clean_filter;
	}
}
