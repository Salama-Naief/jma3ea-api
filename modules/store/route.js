// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store
 */
router.get('/', controller.list);

/**
 * GET /store/:Id/category
 */
router.get('/:Id/category', controller.category);


module.exports = router;
