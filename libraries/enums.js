const config = require("./config");
const local = require(`../i18n/${config.local}`);

exports.payment_methods = [
	{
		id: "cod",
		name: local.payment_method.cod,
		valid: false
	},
	{
		id: "points",
		name: local.payment_method.points,
		valid: false
	},
	{
		id: "knet",
		name: local.payment_method.knet,
		valid: true
	}
];

exports.status_message = {
	"AUTHORIZED": "AUTHORIZED", // Authorized : 200
	"CITY_REQUIRED": "CITY_REQUIRED", // Should city to load data : 500
	"CREATED": "CREATED", // New record has been created : 200
	"DELETED": "DELETED", // Record has been deleted : 200
	"FORBIDDEN": "FORBIDDEN", // User has no permission to access : 403 
	"DATA_LOADED": "DATA_LOADED", // Data has been loaded : 200
	"INVALID_APP_AUTHENTICATION": "INVALID_APP_AUTHENTICATION", // Application credentials are invalid : 500
	"INVALID_URL_PARAMETER": "INVALID_URL_PARAMETER", // Parameter is invalid : 500
	"INVALID_USER_AUTHENTICATION": "INVALID_USER_AUTHENTICATION", // User credentials are invalid : 500
	"NO_DATA": "NO_DATA", // No data found : 200
	"NOT_FOUND": "NOT_FOUND", // Request url is not found : 404
	"RESOURCE_EXISTS": "RESOURCE_EXISTS", // Resource exists & doesn't accept dupplication : 500
	"UNAUTHENTICATED": "UNAUTHENTICATED", // User token invalid : 403
	"UNAUTHORIZED": "UNAUTHORIZED", // Application token invalid : 401
	"UNEXPECTED_ERROR": "UNEXPECTED_ERROR", // Unexpected error : 500
	"UPDATED": "UPDATED", // Recored has been updated : 200
	"VALIDATION_ERROR": "VALIDATION_ERROR" // Validation errors : 500
};