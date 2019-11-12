// Load required modules
const path = require('path');
const app = require(path.resolve('app'));
const config = require(path.resolve('libraries/config'));
const request = require('supertest')(app);
const chai = require('chai');
const expect = chai.expect;

let Id = null;
let token = null;
const appId = process.env.APP_ID_KEY || config.appId;
const appSecret = process.env.APP_SECRET_KEY || config.appSecret;


/**
 * Notifications api test
 */
describe('Notifications', () => {

    /**
     * runs before all tests in this block
     * @param {function} done
     */
    before(function (done) {
        request
                .post("/v1/auth/check")
                .send({
                    "appId": appId,
                    "appSecret": appSecret
                })
                .expect(200)
                .end(function (err, res) {
                    token = res.body.token;
                    done();
                });
    });

    /**
     * Test get one Notification
     */
    it("Responds Notifications One", function (done) {
        request
                .get(`/notification`)
                .set('token', token)
                .expect(200)
                .end(function (err, res) {
                    expect(typeof res.body).to.equal('object');
                    done();
                });
    });
});