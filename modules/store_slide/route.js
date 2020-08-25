// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store_slide/:Id
 */
router.get('/:Id/category', controller.category);

/**
 * GET /store_slide/:Id
 */
router.get('/:Id/store', controller.store);

module.exports = router;
