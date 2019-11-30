// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /support
 */
router.get('/', controller.list);

module.exports = router;
