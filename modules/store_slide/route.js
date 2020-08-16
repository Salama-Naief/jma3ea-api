// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /store_slide/:Id
 */
router.get('/:Id', controller.list);

module.exports = router;
