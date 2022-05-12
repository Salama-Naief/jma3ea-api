// Load required modules
const moment = require('moment');
const Decimal = require('mongodb').Decimal128;

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
	const repeatables = ['ا','أ','إ','آ'];
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
