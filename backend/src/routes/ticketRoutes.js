const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

// ==========================================
// 1. ROTAS PÚBLICAS (HELPDESK / CLIENTE)
// ==========================================
// Acesso externo (sem token de admin do sistema)

router.post('/public/auth', ticketController.clientLogin);
router.post('/public/create', ticketController.createTicketPublic); // Se usar lógica simplificada ou wrapper
router.get('/public/list/:clientId', ticketController.listTicketsPublic);
router.get('/public/ticket/:id', ticketController.getTicketPublic); // Nome ajustado para evitar colisão
router.post('/public/ticket/:id/messages', ticketController.addMessagePublic);
router.get('/public/config/:slug', ticketController.getPortalConfig); // Config visual do portal

// ==========================================
// 2. ROTAS PRIVADAS (PAINEL INTERNO)
// ==========================================
// Requer login no sistema (Admin/Colaborador)
router.use(authMiddleware);

// --- A. ROTAS ESPECÍFICAS (DEVEM VIR ANTES DE /:id) ---

// Configuração do Portal
router.get('/config', ticketController.getConfig);
router.post('/config', ticketController.saveConfig);
router.put('/config', ticketController.saveConfig); // Suporte a PUT também

// Categorias
router.get('/categories', ticketController.getCategories);
router.post('/categories', ticketController.createCategory);
router.delete('/categories/:id', ticketController.deleteCategory);

// Usuários de Suporte (Clientes do Helpdesk)
router.get('/users', ticketController.getSupportUsers);
router.post('/users', ticketController.createSupportUser);

// Agentes (Usuários do Sistema)
router.get('/agents', ticketController.getAgents);

// --- B. ROTAS DE TICKETS (CRUD GERAL) ---

router.get('/', ticketController.getTickets); // Listar todos
router.post('/', ticketController.createTicket); // Criar novo

// --- C. ROTAS DINÂMICAS (DEVEM VIR POR ÚLTIMO) ---
// O erro acontecia porque estas estavam capturando "config" e "users"

router.get('/:id', ticketController.getTicketDetails); // Detalhes
router.put('/:id/status', ticketController.updateStatus); // Mudar status
router.post('/:id/messages', ticketController.addMessage); // Responder

module.exports = router;