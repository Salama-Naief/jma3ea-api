// Load required modules
const ObjectID = require('mongodb').ObjectID;
const common = require('./common');

module.exports = (req) => {
	return validateData(req);
};

/**
 * Validate and data
 * @returns {validateData.row}
 */
function validateData(req) {
	return new Promise((resolve, reject) => {
		const row = req.body;
		if (!row) {
			resolve({
				error: req.custom.local.unexpected_error,
				data: null,
				unset: null
			});
			return;
		}

		validateRow(req, row, req.custom.model).then(({ $set, $unset, $error }) => {
			if (Object.keys($error).length > 0) {
				resolve({
					error: $error,
					data: null,
					unset: $unset
				});
				return;
			}
			const data = getDataWithTypes($set, req.custom.model);
			resolve({
				data: data,
				unset: $unset,
				error: null
			});
		});
	});
}

async function validateRow(req, $set, model) {
	const $error = {};
	const $unset = {};
	const keys = model && typeof model === 'object' ? Object.keys(model) : [];
	const default_local = req.custom.config.local;
	const arr_lang = req.custom.available_languages;
	const local = req.custom.local;
	for (const k of keys) {
		let row_data = $set[k];
		const field = model[k];
		if (!field) {
			continue;
		}
		field.type = field.type || String;
		if (field.required === true && field.isLang === true) {
			for (const lk of arr_lang) {
				if (lk === default_local && (!row_data || !row_data[lk])) {
					$error[k] = $error[k] || {};
					$error[k][lk] = local.errors.required(k);
				} else if ($set[k] && lk !== default_local && (!$set[k] || !$set[k][lk])) {
					delete $set[k][lk];
				}
			}
		} else if (field.required === true && ((!row_data && field.type !== Boolean) || (field.type === Boolean && row_data === undefined)) && field.type !== Object) {
			$error[k] = local.errors.required(k);
		} else if (field.required_or && (!row_data && !$set[field.required_or])) {
			$error[k] = local.errors.required_or(k, field.required_or);
		} else if (field.required_and && (!row_data && $set[field.required_and])) {
			$error[k] = local.errors.required(k);
		} else if (field.equal_to && (row_data !== $set[field.equal_to])) {
			$error[k] = local.errors.should_be_equal(k, field.equal_to);
		} else if (field.length && (row_data.length !== field.length)) {
			$error[k] = local.errors.length_should_be_equal(k, field.length);
		} else if (field.min >= 0 && (row_data < field.min)) {
			$error[k] = local.errors.should_be_more_then(k, field.min);
		} else if (field.max >= 0 && (row_data > field.max)) {
			$error[k] = local.errors.should_be_less_then(k, field.max);
		} else if (!field.isLang &&
			(
				(row_data && typeof row_data !== 'object' && field.type === Object) ||
				(row_data && field.type === 'email' && !validEmail(row_data)) ||
				(field.type === Number && row_data && isNaN(row_data)) ||
				(field.in_array !== null && typeof field.in_array === 'object' && field.in_array.indexOf(row_data) === -1) ||
				(field.type === ObjectID && row_data && typeof row_data.match === 'function' && !row_data.match(/^[0-9a-fA-F]{24}$/) && !ObjectID.isValid(row_data)))) {
			$error[k] = local.errors.is_not_valid(k);
		} else if (field.unique === true && !(await checkIsUnique(req, field.collection, k, row_data))) {
			$error[k] = local.errors.should_be_unique(k);
		} else if (field.exists === true && !(await checkIsExists(req, field.collection, k, row_data))) {
			$error[k] = local.errors.is_not_exists(k);
		} else if (field.type === Object) {
			row_data = row_data || {};
			if (field.model) {
				const _row_ = await validateRow(req, row_data, field.model);
				if (_row_.$set && Object.keys(_row_.$set) > 0) {
					$set[k] = _row_.$set;
				}
				if (_row_.$unset && Object.keys(_row_.$unset) > 0) {
					$unset[k] = _row_.$unset;
				}
				if (_row_.$error && Object.keys(_row_.$error).length > 0) {
					$error[k] = _row_.$error;
				}
			} else {
				$set[k] = row_data;
			}
		} else if (!field.required && (!row_data || row_data.toString().trim() === '')) {
			if (!field.auto) {
				$unset[k] = 1;
			}
			delete $set[k];
		}
		if (field.insertOnly === true) {
			if (req.method === 'POST') {
				if (field.auto === true) {
					$set[k] = field.default_value;
				}
			} else {
				delete $set[k];
			}
		} else if (field.updateOnly) {
			if (req.method === 'PUT') {
				if (field.auto === true) {
					$set[k] = field.default_value;
				}
			} else {
				delete $set[k];
			}
		} else if (field.default_value !== undefined && $set[k] !== undefined) {
			$set[k] = field.default_value;
		} else if (field.ignore) {
			delete $set[k];
		}
	}
	return Promise.resolve({
		$set: $set,
		$unset: $unset,
		$error: $error
	});
}

function getDataWithTypes(row, model, data = {}) {
	const keys = model ? Object.keys(model) : [];
	for (const k of keys) {
		if (row && row[k] !== undefined) {
			const field = model[k];
			if (field.isLang) {
				data[k] = row[k];
				continue;
			}
			switch (field.type) {
			case ObjectID:
				if (row[k]) {
					data[k] = ObjectID(row[k].toString());
				}
				break;
			case Boolean:
				data[k] = Boolean([true, 'true', 1].indexOf(row[k]) > -1);
				break;
			case Date:
				data[k] = common.getDate(row[k].toString());
				break;
			case Number:
				data[k] = Number(common.parseArabicNumbers(row[k]));
				break;
			case Object:
				data[k] = field.model ? getDataWithTypes(row[k], field.model) : row[k];
				break;
			case Array:
				if (row[k] && row[k].length > 0) {
					if (field.model) {
						for (const r in row[k]) {
							if (!data[k]) {
								data[k] = [];
							}
							data[k][r] = getDataWithTypes(row[k][r], field.model);
						}
					} else {
						data[k] = row[k];
					}
				}
				break;
			default:
				data[k] = common.parseArabicNumbers(row[k]);
				break;
			}
		}
	}
	return data;
}

function checkIsUnique(req, collectionName, key, value) {
	return new Promise((resolve, reject) => {
		if (collectionName) {
			const where = {
				[key]: value
			};
			if (req.method === 'PUT') {
				if (req.originalUrl === '/v1/profile/update' && (req.params.Id || req.custom.authorizationObject.member_id)) {
					where._id = {
						$ne: ObjectID(req.path === '/profile/update' ? req.params.Id : req.custom.authorizationObject.member_id.toString())
					};
				} else {
					where._id = {
						$ne: ObjectID(req.params.Id)
					};
				}
			}
			const collection = req.custom.db.client().collection(collectionName);
			collection.findOne(where, function (err, doc) {
				if (err) {
					reject(err);
				} else {
					resolve(!doc);
				}
			});
		} else {
			resolve(true);
		}
	});
}

function checkIsExists(req, collectionName, key, value) {
	return new Promise((resolve, reject) => {
		if (collectionName) {
			const where = {
				[key]: value
			};
			const collection = req.custom.db.client().collection(collectionName);
			collection.findOne(where, function (err, doc) {
				if (err) {
					reject(err);
				} else {
					resolve(!!doc);
				}
			});
		} else {
			resolve(false);
		}
	});
}

function validEmail(email) {
	const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regex.test(email);
};
