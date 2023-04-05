const status_message = require("../../enums/status_message");
const mainController = require("../../libraries/mainController");
const ObjectID = require("../../types/object_id");

const COLLECTION_NAME = 'review';


module.exports.add = async (req, res) => {
    if (req.custom.isAuthorized === false) {
        return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
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

        const collection = req.custom.db.client().collection(COLLECTION_NAME);

        data.created = common.getDate();
        data.member_id = req.custom.authorizationObject.member_id;
        //data.status = false;

        const review = await collection.insertOne(data);

        if (!review) {
            return res.out({
                'message': error.message
            }, status_message.UNEXPECTED_ERROR);
        }

        return res.out({
            'message': req.custom.local.review_added_successfully
        }, status_message.CREATED);


    } catch (err) {
        return res.out({
            'message': err.message
        }, status_message.UNEXPECTED_ERROR);
    }
}


module.exports.list = (req, res) => {
    if (req.custom.isAuthorized === false) {
        return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
    }

    mainController.list(req, res, COLLECTION_NAME, {
        "name": 1,
        "stars": 1,
        "comment": 1,
        "member_id": 1
    }, async (out) => {
        if (out.data.length === 0) {
            return res.out({}, status_message.NO_DATA);
        }

        const reviewsIds = out.data.filter(m => m.member_id && ObjectID.isValid(m.member_id)).map(m => ObjectID(m.member_id));

        if (reviewsIds.length > 0) {
            const member_collection = req.custom.db.client().collection('member');
            const members = await member_collection.find({ _id: { $in: reviewsIds } }, { name: 1 }).toArray();
            for (const review of out.data) {
                if (review.member_id) {
                    const foundMember = members.find(m => m.member_id.toString() === review.member_id.toString());
                    if (foundMember) {
                        review.name = foundMember.fullname;
                    }
                }
            }
        }

        res.out(out);

    });

}