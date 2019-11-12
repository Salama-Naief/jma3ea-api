// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /country
 */
router.get('/', controller.list);

/**
 * GET /country/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
