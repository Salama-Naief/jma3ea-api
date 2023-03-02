// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /cart
 */
router.get('/', controller.list);

/**
 * POST /cart
 */
router.post('/', controller.add);

/**
 * POST /cart/coupon
 */
router.post('/coupon', controller.coupon);

/**
 * DELETE /cart
 */
router.delete('/:Id', controller.remove);

/**
 * POST /cart/clear
 */
router.post('/clear', controller.clear);

/**
 * POST /cart/offer
 */
router.post('/offer', controller.offer);

module.exports = router;
