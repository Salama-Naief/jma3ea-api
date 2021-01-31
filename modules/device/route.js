// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /device
 */
router.get('/', controller.list);

/**
 * POST /device
 */
router.post('/', controller.add);

/**
 * DELETE /device
 */
router.delete('/', controller.remove);

module.exports = router;
