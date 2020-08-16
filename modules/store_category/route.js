// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store_category/:Id
 */
router.get('/:Id', controller.list);

module.exports = router;