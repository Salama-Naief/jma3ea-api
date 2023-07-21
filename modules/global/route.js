const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/products/quantities', controller.cleanProductsQuantities);
router.post('/products/statuses', controller.cleanProductsStatuses);
router.post('/products/strtoint', controller.convertStrToInt);
router.post('/products/normalize', controller.normalize);
router.post('/wallet/strtofloat', controller.convertWalletStrToFloat);
router.post('/member/point_transaction', controller.pointsToTransaction);
router.post('/products/index', controller.indexProducts);
router.delete('/products/index', controller.deleteIndexes);
router.get('/products/index/count', controller.countIndexedProducts);

module.exports = router;