// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /banner/:Id
 */
router.get('/:Id', controller.random_banner);

module.exports = router;
