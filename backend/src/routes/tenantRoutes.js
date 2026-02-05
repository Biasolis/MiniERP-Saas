const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/authMiddleware');
const superAdminMiddleware = require('../middlewares/superAdminMiddleware');

// Todas as rotas abaixo exigem autenticação
router.use(authMiddleware);

// ==========================================
// 1. ROTAS DO TENANT (ADMIN DA EMPRESA)
// ==========================================

// Configurações da Empresa
router.get('/settings', tenantController.getTenantSettings);
router.put('/settings', tenantController.updateTenantSettings);

// Gestão de Equipe
router.get('/users', tenantController.getTeam);
router.post('/users', tenantController.addMember);
router.put('/users/:id', tenantController.updateMember);
router.delete('/users/:id', tenantController.removeMember);

// Campos Personalizados
router.get('/custom-fields', tenantController.getCustomFields);
router.post('/custom-fields', tenantController.saveCustomField);
router.delete('/custom-fields/:id', tenantController.deleteCustomField);

// ==========================================
// 2. ROTAS SAAS (SUPER ADMIN APENAS)
// ==========================================

// Listar todas as empresas do sistema
router.get('/admin/all', superAdminMiddleware, tenantController.listAllTenants);

// Acessar painel de uma empresa específica (Impersonate)
router.post('/admin/:id/impersonate', superAdminMiddleware, tenantController.impersonateTenant);

// Excluir uma empresa do sistema
router.delete('/admin/:id', superAdminMiddleware, tenantController.deleteTenant);

router.get('/all', superAdminMiddleware, tenantController.listAllTenants);

// Aqui removemos o 'admin' do caminho pois ele já está no prefixo do app.js
router.post('/:id/impersonate', superAdminMiddleware, tenantController.impersonateTenant);

router.delete('/:id', superAdminMiddleware, tenantController.deleteTenant);

module.exports = router;