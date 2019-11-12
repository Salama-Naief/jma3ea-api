// Forgot password model

module.exports = {
    "email": {
        "type": "email",
        "required": true,
        "exists": true,
        "collection": 'member'
    },
};