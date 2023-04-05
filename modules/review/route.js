// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /review
 */
router.get('/', controller.list);

/**
 * POST /review
 */
router.post('/', controller.add);

module.exports = router;
