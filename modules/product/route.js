// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { Client } = require('@elastic/elasticsearch');

let esClient = null;

/**
 * GET /product
 */
router.get('/', (req, res, next) => {
    try {
        // Elasticsearch
    if (!esClient) {
        esClient = new Client({ node: 'http://localhost:9200', maxRetries: 5 });
    }
    req.custom.esClient = esClient;
    } catch (err) {
        console.error(err);
    }
    next();
}, controller.list);

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
