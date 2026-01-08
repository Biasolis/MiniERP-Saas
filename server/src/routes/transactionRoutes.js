const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas aqui são protegidas
router.use(authMiddleware);

router.get('/dashboard', transactionController.getDashboard);
router.get('/charts', transactionController.getCharts);
router.post('/', transactionController.create);

module.exports = router;