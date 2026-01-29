const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', saleController.createSale);         // Criar Venda
router.get('/', saleController.getSales);            // Listar Vendas
router.get('/commissions', saleController.getCommissions); // Relatório de Comissões
router.get('/:id', saleController.getSaleDetails);   // Detalhes da Venda

module.exports = router;