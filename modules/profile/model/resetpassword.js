// Forgot password model

module.exports = {
    "reset_hash": {
        "required": true,
        "exists": true,
        "collection": 'member'
	},
    "new_password": {
        "required": true
    },
    "re_new_password": {
        "required": true,
        "equal_to": "new_password"
    }
};