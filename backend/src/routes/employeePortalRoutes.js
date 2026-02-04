const express = require('express');
const router = express.Router();
const timeClockController = require('../controllers/timeClockController');
const ticketController = require('../controllers/ticketController'); 
const authMiddleware = require('../middlewares/authMiddleware');

// Rota Pública (Login)
router.post('/login', timeClockController.employeeLogin);

// Rotas Protegidas
router.use(authMiddleware);

// --- PONTO ---
router.post('/clockin', timeClockController.clockIn);
router.post('/punch', timeClockController.clockIn); // Alias para garantir compatibilidade
router.get('/me/timesheet', timeClockController.getTimesheet);

// --- TICKETS (COLABORADOR) ---
router.get('/tickets', ticketController.getTickets); // Listar
router.post('/tickets', ticketController.createTicket); // Criar

// CORREÇÃO: Adicionadas rotas de detalhe e mensagem que faltavam
router.get('/tickets/:id', ticketController.getTicketDetails); 
router.post('/tickets/:id/messages', ticketController.addMessage);

// --- CARDÁPIO / CATEGORIAS ---
router.get('/categories', ticketController.getCategories);

module.exports = router;