const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', serviceOrderController.listOrders);
router.post('/', serviceOrderController.createOrder);
router.get('/:id', serviceOrderController.getOrderDetails);
router.put('/:id', serviceOrderController.updateOrder); // <--- NOVO: Rota de Edição

router.patch('/:id/status', serviceOrderController.updateStatus);
router.post('/:id/items', serviceOrderController.addItem);
router.delete('/:id/items/:itemId', serviceOrderController.removeItem);

module.exports = router;