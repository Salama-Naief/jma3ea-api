const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/products/quantities', controller.cleanProductsQuantities);
router.post('/products/statuses', controller.cleanProductsStatuses);
router.post('/products/strtoint', controller.convertStrToInt);

module.exports = router;