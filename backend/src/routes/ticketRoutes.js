const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// --- 1. CONFIGURAÇÕES (Admin) ---
// GET /api/tickets/config
router.get('/config', ticketController.getConfig); 
// POST /api/tickets/config
router.post('/config', ticketController.saveConfig); 

// --- 2. CATEGORIAS ---
// GET /api/tickets/admin/categories
router.get('/admin/categories', ticketController.getCategories);
// POST /api/tickets/categories (Atende o handleAddCategory do front)
router.post('/categories', ticketController.createCategory); 
// POST /api/tickets/admin/categories (Alias de segurança)
router.post('/admin/categories', ticketController.createCategory);
// DELETE
router.delete('/admin/categories/:id', ticketController.deleteCategory);

// --- 3. USUÁRIOS / CLIENTES DE SUPORTE ---
// GET /api/tickets/users (Atende loadUsers do front)
// Mapeado para getSupportUsers pois o front lista clientes cadastrados
router.get('/users', ticketController.getSupportUsers);
// POST /api/tickets/users (Atende handleAddSupportUser do front)
router.post('/users', ticketController.createSupportUser);

// --- 4. AGENTES INTERNOS (Opcional, se precisar no futuro) ---
router.get('/agents', ticketController.getAgents);

// --- 5. OPERAÇÃO DE TICKETS ---
router.get('/', ticketController.getTickets);
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicketDetails);
router.post('/:ticketId/messages', ticketController.addMessage);
router.patch('/:id/status', ticketController.updateStatus);

module.exports = router;