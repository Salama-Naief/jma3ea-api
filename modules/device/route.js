// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * GET /device
 */
router.get('/', controller.list);

/**
 * GET /device/city
 */
router.get('/city', controller.getDevicesWithCity);

/**
 * POST /device
 */
router.post('/', controller.add);

/**
 * PUT /device
 */
router.put('/:Id', controller.update);

/**
 * DELETE /device
 */
router.delete('/', controller.remove);

module.exports = router;
