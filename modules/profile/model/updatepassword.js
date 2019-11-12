// Brand model
module.exports = {
    "old_password": {
        "required": true
    },
    "new_password": {
        "required": true
    },
    "re_new_password": {
        "required": true,
        "equal_to": "new_password"
    }
};