const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// --- ROTAS ESPECÍFICAS (Devem vir ANTES de /:id) ---
// Resumo Financeiro (Cards)
router.get('/summary', transactionController.getSummary); 

// Dashboard & Gráficos
router.get('/dashboard', transactionController.getDashboardSummary);
router.get('/recent', transactionController.getRecentTransactions);
router.get('/categories', transactionController.getCategoryStats);
router.get('/chart-data', transactionController.getChartData);
router.get('/ai-analysis', transactionController.getAiReport);

// --- CRUD PADRÃO ---
router.get('/', transactionController.listTransactions);      // Listar
router.post('/', transactionController.createTransaction);    // Criar

// --- ROTAS COM ID ---
router.get('/:id', transactionController.getTransactionById); // Detalhes
router.put('/:id', transactionController.updateTransaction);  // Edição Completa
router.patch('/:id/status', transactionController.updateTransactionStatus); // Atualizar Status
router.delete('/:id', transactionController.deleteTransaction); // Excluir

module.exports = router;