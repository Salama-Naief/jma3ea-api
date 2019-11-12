// Load required modules
const ObjectID = require('mongodb').ObjectID;

module.exports = async (req) => {
	return await validateData(req);
};

/**
 * Validate and data
 * @returns {validateData.row}
 */
async function validateData(req) {
	const row = req.body;
	if (!row) {
		return {
			"error": req.custom.local.unexpected_error,
			"data": null,
			"unset": unset
		};
	}

	const {
		$set,
		$unset,
		$error
	} = await validateRow(req, row, req.custom.model);
	if (Object.keys($error).length > 0) {
		return {
			"error": $error,
			"data": null,
			"unset": $unset
		};
	}
	const data = getDataWithTypes($set, req.custom.model);
	return {
		"data": data,
		"unset": $unset,
		"error": null
	};
}

async function validateRow(req, $set, model) {
	const $error = {};
	const $unset = {};
	const keys = typeof model == 'object' ? Object.keys(model) : [];
	const default_local = req.custom.config.local;
	const arr_lang = req.custom.available_languages;
	for (const k of keys) {
		let row_data = $set[k];
		const field = model[k];
		field.type = field.type || String;
		if (field.required === true && field.isLang === true) {
			for (const lk of arr_lang) {
				if (lk === default_local && (!row_data || !row_data[lk])) {
					$error[k] = $error[k] || {};
					$error[k][lk] = `${k}.${lk} Required`;
				} else if ($set[k] && lk !== default_local && (!$set[k] || !$set[k][lk])) {
					delete $set[k][lk];
				}
			}
		} else if (field.required === true && ((!row_data && field.type !== Boolean) || (field.type === Boolean && row_data === undefined)) && field.type !== Object) {
			$error[k] = `${k} Required`;
		} else if (field.required_or && (!row_data && !$set[field.required_or])) {
			$error[k] = `${k} Or ${field.required_or} Required`;
		} else if (field.required_and && (!row_data && $set[field.required_and])) {
			$error[k] = `${k} Required`;
		} else if (field.equal_to && (row_data !== $set[field.equal_to])) {
			$error[k] = `${k} should be equal to ${field.equal_to}`;
		} else if (field.length && (row_data.length !== field.length)) {
			$error[k] = `${k} length should be equal ${field.length}`;
		} else if (!field.isLang &&
			(
				(row_data && typeof row_data !== 'object' && field.type == Object) ||
				(row_data && field.type == 'email' && !validEmail(row_data)) ||
				(field.type === Number && isNaN(row_data)) ||
				(typeof field.in_array == 'object' && field.in_array.indexOf(row_data) == -1) ||
				(field.type === ObjectID && typeof row_data.match == "function" && !row_data.match(/^[0-9a-fA-F]{24}$/) && !ObjectID.isValid(row_data)))) {
			$error[k] = `${k} is not valid`;
		} else if (field.unique == true && !(await checkIsUnique(req, field.collection, k, row_data))) {
			$error[k] = `${k} is unique`;
		} else if (field.exists == true && !(await checkIsExists(req, field.collection, k, row_data))) {
			$error[k] = `${k} is not exists`;
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
					$set[k] = field.default;
				}
			} else {
				delete $set[k];
			}
		} else if (field.updateOnly) {
			if (req.method === 'PUT') {
				if (field.auto === true) {
					$set[k] = field.default;
				}
			} else {
				delete $set[k];
			}
		}
	}
	return {
		$set: $set,
		$unset: $unset,
		$error: $error
	}
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
					data[k] = Boolean(row[k].toString());
					break;
				case Date:
					data[k] = new Date(row[k].toString());
					break;
				case Number:
					data[k] = Number(row[k].toString());
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
					data[k] = row[k].toString();
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
				where._id = {
					'$ne': ObjectID(req.params.Id)
				};
			}
			const collection = req.custom.db.client().collection(collectionName);
			collection.findOne(where, function (err, doc) {
				if (err) {
					reject(err);
				} else {
					resolve(doc ? false : true);
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
					resolve(doc ? true : false);
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