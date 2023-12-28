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
 * GET /feature/:Id/ranks
 */
router.get('/:Id/ranks', controller.ranks);

module.exports = router;
