// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /checkout
 */
router.get('/', controller.list);

/**
 * POST /checkout
 */
router.post('/', controller.buy);

/**
 * POST /checkout/error
 */
router.post('/error', controller.error);

module.exports = router;
