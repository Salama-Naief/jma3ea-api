// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /brand
 */
router.get('/', controller.list);

/**
 * GET /brand/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
