// Brands Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = 'brand';

/**
 * List all brands
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res) {
	if (req.query && req.query['starts_with'] && req.query['starts_with'] !== "all") {
		req.custom.clean_filter['name.' + req.custom.lang] = { $regex: new RegExp("^" + req.query['starts_with'].toLowerCase(), "i") }
	} else {
		req.custom.cache_key = `${collectionName}_${req.custom.lang}_page_${req.custom.skip}`;
	}
	mainController.list(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"picture": 1
	});
};

/**
 * Read brand by id
 * @param {Object} req
 * @param {Object} res
 */
 module.exports.read = function (req, res) {
	mainController.read(req, res, collectionName, {
		"_id": 1,
		"name": {
			$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
		},
		"description": {
			$ifNull: [`$description.${req.custom.lang}`, `$description.${req.custom.config.local}`]
		},
		"picture": 1
	}, async (data) => {
		const collection = req.custom.db.client().collection("category");
		const categories = await collection.aggregate([
			{ $match: { status: true } },
			{
				$lookup:
				{
					from: "product",
					localField: "_id",
					foreignField: "prod_n_categoryArr.category_id",
					pipeline: [
						{
							$match: { $and: [{ brand_id: new ObjectId(data._id) }, { status: true }] },
						}
					],
					as: "products"
				}
			},
			{ $match: { $expr: { $gt: [{ $size: "$products" }, 0] } } },
			{
				$project: {
					"_id": 1,
					"name": {
						$ifNull: [`$name.${req.custom.lang}`, `$name.${req.custom.config.local}`]
					},
					"products_count": { $size: "$products" }
				}
			}
		]).toArray();
		if (categories) data.categories = categories;
		return res.out(data);
	});
};