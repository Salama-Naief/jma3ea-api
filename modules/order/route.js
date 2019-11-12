// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /order
 */
router.get('/', controller.list);

/**
 * GET /order/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
