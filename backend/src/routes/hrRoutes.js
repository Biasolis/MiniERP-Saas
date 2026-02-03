const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// --- COLABORADORES ---
router.get('/employees', hrController.getEmployees);
router.post('/employees', hrController.createEmployee);
router.put('/employees/:id', hrController.updateEmployee);
router.delete('/employees/:id', hrController.deleteEmployee);

// --- DEPARTAMENTOS ---
router.get('/departments', hrController.getDepartments);
router.post('/departments', hrController.createDepartment);
router.delete('/departments/:id', hrController.deleteDepartment);

// --- CARGOS ---
router.get('/positions', hrController.getPositions);
router.post('/positions', hrController.createPosition);
router.delete('/positions/:id', hrController.deletePosition);

// --- RECRUTAMENTO ---
router.get('/recruitment/openings', hrController.getJobOpenings);
router.post('/recruitment/openings', hrController.createJobOpening);
router.delete('/recruitment/openings/:id', hrController.deleteJobOpening);

router.get('/recruitment/candidates', hrController.getCandidates);
router.post('/recruitment/candidates', hrController.createCandidate);
router.delete('/recruitment/candidates/:id', hrController.deleteCandidate);

// --- DEMISSÕES ---
router.get('/terminations', hrController.getTerminations);
router.post('/terminations', hrController.createTermination);

// --- FORMULÁRIOS & PRIVADOS ---
router.get('/forms', hrController.getForms);
router.post('/forms', hrController.createForm);
router.delete('/forms/:id', hrController.deleteForm);

// --- GESTÃO DE PONTO (NOVO - AJUSTES DO RH) ---
// Visualizar espelho de um funcionário específico
router.get('/timesheet/:employeeId', hrController.getEmployeeTimesheet);

// Adicionar batida manual (esquecimento)
router.post('/timesheet/manual', hrController.addManualRecord);

// Editar horário de uma batida
router.put('/timesheet/:id', hrController.updateRecord);

// Excluir batida (duplicidade/erro)
router.delete('/timesheet/:id', hrController.deleteRecord);

module.exports = router;