// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /notification
 */
router.get('/', controller.read);

/**
 * PUT /notification
 */
router.put('/:Id', controller.update2sent);

module.exports = router;
