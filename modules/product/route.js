// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /product
 */
router.get('/', controller.list);

/**
 * GET /product/featured
 */
router.get('/featured', controller.featured);

/**
 * GET /product/:sku
 */
router.get('/:sku', controller.read);

/**
 * GET /product/:Id/category
 */
router.get('/:Id/category', controller.listByCategory);

/**
 * GET /product/:Id/category/:rankId/rank
 */
router.get('/:Id/category/:rankId/rank', controller.listByCategory);

module.exports = router;
