const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Funcionários
router.get('/employees', hrController.listEmployees);
router.post('/employees', hrController.createEmployee);
router.put('/employees/:id', hrController.updateEmployee);
router.delete('/employees/:id', hrController.deleteEmployee);

// Departamentos
router.get('/departments', hrController.listDepartments);
router.post('/departments', hrController.createDepartment);

module.exports = router;