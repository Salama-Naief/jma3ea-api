// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * POST /auth/check
 */
router.post('/check', controller.check);

module.exports = router;
