const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.put('/products/quantities', controller.cleanProductsQuantities);
router.put('/products/statuses', controller.cleanProductsStatuses);
router.put('/products/strtoint', controller.convertStrToInt);

module.exports = router;