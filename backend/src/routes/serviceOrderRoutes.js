const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', serviceOrderController.getServiceOrders);
router.get('/:id', serviceOrderController.getServiceOrderDetails);
router.post('/', serviceOrderController.createServiceOrder);

// ROTA DE EDIÇÃO (NOVA)
router.put('/:id', serviceOrderController.updateServiceOrder);

router.patch('/:id/status', serviceOrderController.updateStatus);

// Rotas de Itens
router.post('/:id/items', serviceOrderController.addItem);
router.delete('/:id/items/:itemId', serviceOrderController.removeItem);

module.exports = router;