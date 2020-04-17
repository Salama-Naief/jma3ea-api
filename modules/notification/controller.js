// Notifications Controller
const ObjectID = require("@big_store_core/base/types/object_id");

// Load required modules
const status_message = require('@big_store_core/base/enums/status_message');
const collectionName = 'notification';
/**
 * Read notification by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res) {
    const collection = req.custom.db.client().collection(collectionName);
    collection.findOne({ "sent": { $eq: null } }, function (err, result) {
        if (err) {
            return res.out({ 'error': err.message }, status_message.UNEXPECTED_ERROR);
        }
        res.out(result);
    });
};
/**
 * Read notification by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update2sent = function (req, res) {
    const collection = req.custom.db.client().collection(collectionName);
    collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: { sent: new Date() } })
        .then((response) => res.out({ message: req.custom.local.saved_done }))
        .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};