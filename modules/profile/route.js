// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /profile
 */
router.get('/', controller.me);

/*
 * AUTH OBJECT TEST
 */
//router.get('/auth_object', controller.getAuthObject);

/**
 * POST /profile/login
 */
router.post('/login', controller.login);

/**
 * GET /profile/logout
 */
router.get('/logout', controller.logout);

/**
 * POST /profile/register
 */
router.post('/register', controller.register);

/**
 * PUT /profile/update
 */
router.put('/update', controller.update);

/**
 * PUT /profile/updatepassword
 */
router.put('/updatepassword', controller.updatepassword);

/**
 * POST /profile/forgotpassword
 */
router.post('/forgotpassword', controller.forgotpassword);
/**
 * POST /verify-forget-password
 */

router.post('/verify-otp', controller.verifyOtp);
/**
 * PUT /profile/resetpassword
 */
router.post('/resetpassword', controller.resetpassword);

/**
 * PUT /profile/updatecity
 */
router.put('/updatecity', controller.updatecity);

/**
 * PUT /profile/updateemail
 */
router.put('/updateemail', controller.me);

/**
 * PUT /profile/wallet
 */
router.put('/wallet', controller.points2wallet);

/**
 * PUT /profile/wallet/add
 */
router.post('/wallet/add', controller.chargeWallet);

/**
 * PUT /profile/shipping
 */
router.post('/shipping', controller.getTheMonthShipping);

/**
 * PUT /profile/wallet/send
 */
 router.put('/wallet/send', controller.sendToWallet);

/**
 * GET /profile/wallet_history
 */
router.get('/wallet_history', controller.wallet_history);

/**
 * GET /profile/points
 */
router.get('/points', controller.list_points);

/**
 * DELETE /profile
 */
 router.delete('/', controller.delete);

 /**
 * GET /profile/points/transfer
 */
router.post('/points/transfer', controller.transfer_order_points);
 

module.exports = router;
