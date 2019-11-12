// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /city
 */
router.get('/', controller.list);

/**
 * GET /city/:Id
 */
router.get('/:Id', controller.read);

/**
 * GET /product/:Id/country
 */
router.get('/:Id/country', controller.listByCountry);

module.exports = router;
