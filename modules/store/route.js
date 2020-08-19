// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store_category
 */
router.get('/:Id/category', controller.category);


module.exports = router;
