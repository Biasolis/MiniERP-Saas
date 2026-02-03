const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ajuste o caminho se necessário

router.use(authMiddleware);

// Rotas Básicas
router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleDetails);

// Rotas de Edição (Venda Consultiva)
router.patch('/:id', saleController.updateSale); // Atualizar Cliente
router.post('/:id/items', saleController.addItem); // Adicionar Item
router.delete('/:id/items/:itemId', saleController.removeItem); // Remover Item
router.post('/:id/finish', saleController.finishSale); // Finalizar

module.exports = router;