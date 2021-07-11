// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /profile
 */
router.get('/', controller.me);

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
 * PUT /profile/resetpassword
 */
router.put('/resetpassword/:hash', controller.resetpassword);

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
 * GET /profile/wallet_history
 */
router.put('/wallet_history', controller.wallet_history);

module.exports = router;
