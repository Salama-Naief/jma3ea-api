// Update Password model
const Field = require("../../libraries/field");

module.exports = {
    "old_password": new Field({
        "required": true
    }),
    "new_password": new Field({
        "required": true
    }),
    "re_new_password": new Field({
        "required": true,
        "equal_to": "new_password"
    })
};