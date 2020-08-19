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
 * api test
 */
describe('Store', () => {

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
     * Test Store list
     */
    it("Responds Store List", function (done) {
        request
                .get("/v1/store")
                .set('token', token)
                .expect(200)
                .end(function (err, res) {
                    expect(Array.isArray(res.body)).to.equal(true);
                    const elm = Math.floor(Math.random() * (res.body.length - 1)) + 0;
                    Id = res.body[elm]['_id'];
                    done();
                });
    });
    
});
