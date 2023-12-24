// Rewards Controller

// Load required modules
const ObjectID = require("../../types/object_id");
const status_message = require('../../enums/status_message');
const mainController = require("../../libraries/mainController");
const collectionName = 'reward';

/**
 * List all pages
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	mainController.list_all(req, res, collectionName, {
		"_id": 1,
		"title": {
			$ifNull: [`$title.${req.custom.lang}`, `$title.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"product.name": {
			$ifNull: [`$product.name.${req.custom.lang}`, `$product.name.${req.custom.config.local}`]
		},
		"product.picture": {
			$ifNull: [`$product.picture.${req.custom.lang}`, `$product.picture.${req.custom.config.local}`]
		},
		"target_points": 1,
		"sorting": 1,
		"expires_at": 1
	});
};
/**
 * Read page by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.claim = async (req, res) => {
	try {
		if (req.custom.isAuthorized === false) {
			return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
		}
	
		const collection = req.custom.db.collection(collectionName);
		const member_collection = req.custom.db.collection("member");
		const point_history_collection = req.custom.db.collection('point_history');
	
		req.custom.model = req.custom.model || require('./model/claim');
	
		const { data, error } = await req.custom.getValidData(req);
	
		if (error && Object.keys(error).length > 0) {
			return res.out(error, status_message.VALIDATION_ERROR);
		}

		const profile = require('../profile/controller');
	
		const user = await profile.getInfo(req);
		if (!user) {
			return res.out({
				"message": req.custom.local.no_user_found
			}, status_message.VALIDATION_ERROR);
		}
	
		const reward = await collection.findOne({ status: true, _id: ObjectID(data.reward_id.toString()) });
	
		if (!reward) {
			return res.out({
				"message": "The offer is not found"
			}, status_message.VALIDATION_ERROR);
		}
	
		if (parseInt(reward.target_points) > parseInt(user.points)) {
			return res.out({
				"message": "No enough points"
			}, status_message.VALIDATION_ERROR);
		}
	
		const points = parseInt(user.points) - parseInt(reward.target_points);
	
		await member_collection.updateOne({
			_id: ObjectID(user._id.toString())
		}, {
			$set: {
				points,
			}
		})
	
		const point_data = {
			"member_id": ObjectID(user._id.toString()),
			"old_points": user.points,
			"new_points": points,
			"old_wallet": user.wallet,
			"new_wallet": user.wallet,
			"type": "claimed_reward",
			"reward_id": ObjectID(reward._id.toString()),
			"rewarded": false,
			"created": new Date(),
		};
		await point_history_collection.insertOne(point_data);
		return res.out({
			message: "Rewarded!",
			points: points,
		}, status_message.UPDATED);
	} catch (e) {
		console.error(req.originalUrl, e);
		res.out({
			'message': e.message
		}, status_message.UNEXPECTED_ERROR)
	}


};