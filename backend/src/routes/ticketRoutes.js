const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// --- Configurações (Admin) ---
// Frontend chama: GET /api/tickets/config
router.get('/config', ticketController.getConfig); 
// Frontend chama: PUT /api/tickets/config (ou POST)
router.post('/config', ticketController.saveConfig);
router.put('/config', ticketController.saveConfig);

// --- Categorias ---
// Frontend chama: GET /api/tickets/admin/categories
router.get('/admin/categories', ticketController.getCategories);
router.post('/admin/categories', ticketController.createCategory);
router.delete('/admin/categories/:id', ticketController.deleteCategory);

// --- Usuários (Agents) ---
// Frontend chama: GET /api/tickets/users
router.get('/users', ticketController.getUsers);

// --- Operação Tickets ---
router.get('/', ticketController.getTickets);
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicketDetails);
router.post('/:ticketId/messages', ticketController.addMessage); // Atenção ao nome do param
router.patch('/:id/status', ticketController.updateStatus);

module.exports = router;