// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /ticker
 */
router.get('/', controller.list);

module.exports = router;
