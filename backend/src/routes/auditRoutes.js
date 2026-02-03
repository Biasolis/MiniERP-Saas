const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protege a rota
router.use(authMiddleware);

// Rota para buscar logs
// O ERRO ESTAVA AQUI: Certifique-se de que é auditController.getLogs
router.get('/', auditController.getLogs);

module.exports = router;