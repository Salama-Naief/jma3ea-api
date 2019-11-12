// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /cart
 */
router.get('/', controller.list);

/**
 * POST /cart
 */
router.post('/', controller.add);

/**
 * DELETE /cart
 */
router.delete('/:Id', controller.remove);

module.exports = router;
