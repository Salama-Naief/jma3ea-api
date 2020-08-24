// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /category
 */
router.get('/', controller.list);

/**
 * GET /category/:Id
 */
router.get('/:Id', controller.read);

/**
 * GET /category/:Id/ranks
 */
router.get('/:Id/ranks', controller.ranks);

/**
 * GET /category/:Id/store
 */
router.get('/:Id/store', controller.store);

module.exports = router;
