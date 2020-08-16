// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store_category
 */
router.get('/', controller.list);

/**
 * GET /store_category/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
