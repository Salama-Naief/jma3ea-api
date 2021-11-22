// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /wishlist
 */
router.get('/', controller.list);

/**
 * POST /wishlist
 */
router.post('/', controller.add);

/**
 * DELETE /wishlist
 */
router.delete('/:sku', controller.remove);

module.exports = router;
