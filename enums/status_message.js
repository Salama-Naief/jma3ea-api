// Status messages for api requests
module.exports = {
	// Application Upgrade : 200
	APPLICATION_UPGRADE: 'APPLICATION_UPGRADE',
	// Authorized : 200
	AUTHORIZED: 'AUTHORIZED',
	// Should city to load data : 500
	CITY_REQUIRED: 'CITY_REQUIRED',
	// New record has been created : 200
	CREATED: 'CREATED',
	// Record has been deleted : 200
	DELETED: 'DELETED',
	// User has no permission to access : 403
	FORBIDDEN: 'FORBIDDEN',
	// Data has been loaded : 200
	DATA_LOADED: 'DATA_LOADED',
	// Application credentials are invalid : 500
	INVALID_APP_AUTHENTICATION: 'INVALID_APP_AUTHENTICATION',
	// Parameter is invalid : 500
	INVALID_URL_PARAMETER: 'INVALID_URL_PARAMETER',
	// User credentials are invalid : 500
	INVALID_USER_AUTHENTICATION: 'INVALID_USER_AUTHENTICATION',
	// No data found : 200
	NO_DATA: 'NO_DATA',
	// Request url is not found : 404
	NOT_FOUND: 'NOT_FOUND',
	// Resource exists & doesn't accept dupplication : 500
	RESOURCE_EXISTS: 'RESOURCE_EXISTS',
	// User should empty cart first : 500
	STORE_CHANGING_EMPTY_CART_FIRST: 'STORE_CHANGING_EMPTY_CART_FIRST',
	// User token invalid : 403
	UNAUTHENTICATED: 'UNAUTHENTICATED',
	// Application token invalid : 401
	UNAUTHORIZED: 'UNAUTHORIZED',
	// Unexpected error : 500
	UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
	// Recored has been updated : 200
	UPDATED: 'UPDATED',
	// Validation errors : 500
	VALIDATION_ERROR: 'VALIDATION_ERROR'
};
