const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

// ==========================================
// 1. ROTAS PÚBLICAS (HELPDESK / CLIENTE)
// ==========================================

router.post('/public/auth', ticketController.clientLogin);
router.post('/public/create', ticketController.createTicketPublic);
router.get('/public/list/:clientId', ticketController.listTicketsPublic);
router.get('/public/ticket/:id', ticketController.getTicketPublic);
router.post('/public/ticket/:id/messages', ticketController.addMessagePublic);
router.get('/public/config/:slug', ticketController.getPortalConfig);
router.get('/public/categories/:tenantId', ticketController.getPublicCategories);

// ==========================================
// 2. ROTAS PRIVADAS (PAINEL INTERNO)
// ==========================================
router.use(authMiddleware);

// --- A. ROTAS ESPECÍFICAS ---

router.get('/config', ticketController.getConfig);
router.post('/config', ticketController.saveConfig);
router.put('/config', ticketController.saveConfig);

router.get('/categories', ticketController.getCategories);
router.post('/categories', ticketController.createCategory);
router.delete('/categories/:id', ticketController.deleteCategory);

router.get('/users', ticketController.getSupportUsers);
router.post('/users', ticketController.createSupportUser);

router.get('/agents', ticketController.getAgents);

// --- B. ROTAS DE TICKETS ---

router.get('/', ticketController.getTickets); 
router.post('/', ticketController.createTicket); 

// --- C. ROTAS DINÂMICAS ---

router.get('/:id', ticketController.getTicketDetails);

// CORREÇÃO AQUI: Mudado de router.put para router.patch para casar com o frontend
router.patch('/:id/status', ticketController.updateStatus); 

router.post('/:id/messages', ticketController.addMessage); 

module.exports = router;