// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * DELETE /coupon
 */
router.delete('/', controller.remove_coupon);

module.exports = router;
 