const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/serviceOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protege todas as rotas com autenticação
router.use(authMiddleware);

// --- ROTA DE IMPRESSÃO (NOVA) ---
router.get('/:id/print', serviceOrderController.print);

// Rotas Padrão
router.get('/', serviceOrderController.listOrders);
router.post('/', serviceOrderController.createOrder);
router.get('/:id', serviceOrderController.getOrderDetails);
router.put('/:id', serviceOrderController.updateOrder);

// Rotas Específicas
router.patch('/:id/status', serviceOrderController.updateStatus);
router.post('/:id/items', serviceOrderController.addItem);
router.delete('/:id/items/:itemId', serviceOrderController.removeItem);

module.exports = router;