// Notifications Controller
const ObjectID = require("../../types/object_id");
const common = require('../../libraries/common');

// Load required modules
const status_message = require('../../enums/status_message');
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
    if (!ObjectID.isValid(req.params.Id)) {
        return res.out({
            'message': req.custom.local.id_not_valid
        }, status_message.INVALID_URL_PARAMETER);
    }
    const collection = req.custom.db.client().collection(collectionName);
    collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: { sent: common.getDate() } })
        .then((response) => res.out({ message: req.custom.local.saved_done }))
        .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
};

/**
 * Count up the opened notifications count
 * @param {Object} req
 * @param {Object} res
 */
module.exports.notificationOpened = (req, res) => {
    if (!ObjectID.isValid(req.params.Id)) {
        return res.out({
            'message': req.custom.local.id_not_valid
        }, status_message.INVALID_URL_PARAMETER);
    }
    const collection = req.custom.db.client().collection(collectionName);
    collection.updateOne({ _id: ObjectID(req.params.Id) }, [
        { $set: { incrementBy: 1 } },
        { $addFields: { opened_count: { $sum: ["$opened_count", "$incrementBy"] } } },
        { $unset: "incrementBy" }
      ])
        .then((response) => res.out({ message: req.custom.local.saved_done }))
        .catch((error) => res.out({ 'message': error.message }, status_message.UNEXPECTED_ERROR));
}