const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const timeClockController = require('../controllers/timeClockController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Folha de Pagamento
router.get('/payrolls', payrollController.getPayrolls);
router.post('/payrolls', payrollController.generatePayroll);

// Gestão de Ponto (Visão do Admin)
router.get('/timesheet/:employee_id', timeClockController.getTimesheet);
router.post('/clockin-admin', timeClockController.clockIn);
router.post('/employees/:id/password', timeClockController.setEmployeePassword);

module.exports = router;