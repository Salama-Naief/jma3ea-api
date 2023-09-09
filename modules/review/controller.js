const status_message = require("../../enums/status_message");
const mainController = require("../../libraries/mainController");
const common = require("../../libraries/common");
const ObjectID = require("../../types/object_id");

const COLLECTION_NAME = 'review';


module.exports.add = async (req, res) => {
    if (req.custom.isAuthorized === false) {
        return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
    }

    const profile = require('../profile/controller');
    let user_info = await profile.getInfo(req, {
        _id: 1,
        fullname: 1,
    }).catch((e) => console.error(e));

    if (user_info) {
        if (user_info.fullname)
            req.body.name = user_info.fullname
    }

    req.custom.model = req.custom.model || require('./model/add');

    try {
        const {
            data,
            error
        } = await req.custom.getValidData(req);

        if (error) {
            return res.out(error, status_message.VALIDATION_ERROR);
        }

        if (req.custom.authorizationObject.member_id) {
            data.member_id = req.custom.authorizationObject.member_id;
        }

        const collection = req.custom.db.client().collection(COLLECTION_NAME);

        data.created = common.getDate();
        data.status = true;

        const review = await collection.insertOne(data);

        if (!review) {
            return res.out({
                'message': error.message
            }, status_message.UNEXPECTED_ERROR);
        }

        const supplier_collection = req.custom.db.client().collection('supplier');

        const supplierReviews = await supplier_collection.aggregate([
            {
                $match: { _id: ObjectID(data.supplier_id.toString()) }
            },
            {
                $lookup: {
                    from: "review",
                    localField: "_id",
                    foreignField: "supplier_id",
                    as: "reviews"
                }
            },
            {
                $project: {
                    rating: {
                        $avg: "$reviews.rating"
                    },
                    reviews_count: {
                        $size: "$reviews"
                    }
                }
            }
        ]).toArray();


        if (supplierReviews && supplierReviews.length > 0) {
            const supplierReview = supplierReviews[0];
            await supplier_collection.updateOne({ _id: ObjectID(data.supplier_id.toString()) }, {
                $set: {
                    avg_rating: Number(supplierReview.rating.toFixed(1)),
                    reviews_count: supplierReview.reviews_count
                }
            });
        }

        await req.custom.cache.unset('inventory');

        return res.out({
            'message': req.custom.local.review_added_successfully
        }, status_message.CREATED);


    } catch (err) {
        console.log('err: ', err);
        return res.out({
            'message': err.message
        }, status_message.UNEXPECTED_ERROR);
    }
}


module.exports.list = (req, res) => {
    if (req.custom.isAuthorized === false) {
        return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
    }

    if (!req.query || !req.query.supplier_id || !ObjectID.isValid(req.query.supplier_id)) {
        return res.out({}, status_message.UNEXPECTED_ERROR);
    }

    req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);

    mainController.list(req, res, COLLECTION_NAME, {
        "name": 1,
        "rating": 1,
        "comment": 1,
        "member_id": 1,
        "created": 1
    }, (out) => {
        if (out.data.length === 0) {
            return res.out(out, status_message.NO_DATA);
        }

        const supplier_collection = req.custom.db.client().collection('supplier');
        supplier_collection.findOne({ _id: req.custom.clean_filter['supplier_id'] }, { avg_rating: 1, reviews_count: 1 }).then(supplier => {

            out.avg_rating = supplier.avg_rating;
            out.reviews_count = supplier.reviews_count;
            return res.out(out);
        }).catch(err => {
            return res.out({ message: err.message }, status_message.UNEXPECTED_ERROR)
        });


    });

}