// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /app_popup
 */
router.get('/', controller.list);

/**
 * GET /app_popup/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
