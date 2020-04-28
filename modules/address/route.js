// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * POST /address
 */
router.get('/', controller.get);

/**
 * POST /address
 */
router.post('/', controller.insert);

/**
 * PUT /address
 */
router.put('/', controller.update);

/**
 * DELETE /address
 */
router.delete('/', controller.remove);


module.exports = router;
