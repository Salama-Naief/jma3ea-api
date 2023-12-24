// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /page
 */
router.get('/', controller.list);

/**
 * GET /page/:Id
 */
router.post('/', controller.claim);

module.exports = router;
