const express = require('express');
const router = express.Router();
const timeClockController = require('../controllers/timeClockController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rota Pública (Login do Colaborador)
router.post('/login', timeClockController.employeeLogin);

// Rotas Protegidas (Requer Token)
router.use(authMiddleware);

router.post('/clockin', timeClockController.clockIn);
router.get('/me/timesheet', timeClockController.getTimesheet);

module.exports = router;