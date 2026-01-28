const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protege todas as rotas abaixo (exige login)
router.use(authMiddleware);

// ==========================================
// 1. CONFIGURAÇÕES DA EMPRESA (DADOS & IMPRESSÃO)
// ==========================================
// Busca dados para a aba "Dados da Empresa"
router.get('/settings', tenantController.getTenantSettings);

// Atualiza dados (incluindo rodapé de impressão e endereço)
router.put('/settings', tenantController.updateTenantSettings);

// ==========================================
// 2. GESTÃO DE EQUIPE (USUÁRIOS)
// ==========================================
// Busca a lista de usuários para a aba "Equipe" (NOVO)
router.get('/users', tenantController.getTeam);

// Adiciona novo membro (antigo createUser)
router.post('/users', tenantController.addMember);

// Remove membro (antigo deleteUser)
router.delete('/users/:id', tenantController.removeMember);

module.exports = router;