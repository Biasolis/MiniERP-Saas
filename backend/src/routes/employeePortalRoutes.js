const express = require('express');
const router = express.Router();
const timeClockController = require('../controllers/timeClockController');
const ticketController = require('../controllers/ticketController'); // <--- IMPORTAÇÃO OBRIGATÓRIA
const authMiddleware = require('../middlewares/authMiddleware');

// Rota Pública (Login)
router.post('/login', timeClockController.employeeLogin);

// Rotas Protegidas
router.use(authMiddleware);

// --- PONTO ---
router.post('/clockin', timeClockController.clockIn);
router.get('/me/timesheet', timeClockController.getTimesheet);

// --- TICKETS (COLABORADOR) ---
// Verifica se ticketController.getTickets existe antes de usar (Evita crash undefined)
router.get('/tickets', ticketController.getTickets);
router.post('/tickets', ticketController.createTicket);

// --- CARDÁPIO / CATEGORIAS ---
router.get('/categories', ticketController.getCategories); // <--- AQUI ESTÁ O CARDÁPIO

module.exports = router;