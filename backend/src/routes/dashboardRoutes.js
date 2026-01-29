const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rota atualizada para bater com o novo Controller
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;