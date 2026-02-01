const express = require('express');
const router = express.Router();
const pcpController = require('../controllers/pcpController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/settings', pcpController.getSettings);
router.post('/settings/drivers', pcpController.saveDriver);
router.delete('/settings/drivers/:id', pcpController.deleteDriver);

router.get('/orders', pcpController.listOrders);
router.post('/orders', pcpController.createOrder);
router.get('/orders/:id', pcpController.getOrderDetails);
router.patch('/orders/:id/status', pcpController.updateStatus);

module.exports = router;