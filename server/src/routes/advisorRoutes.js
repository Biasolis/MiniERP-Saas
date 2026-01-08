const express = require('express');
const router = express.Router();
const advisorController = require('../controllers/advisorController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Endpoint para forçar a geração de um novo insight
router.post('/insight', advisorController.getInsights);

module.exports = router;