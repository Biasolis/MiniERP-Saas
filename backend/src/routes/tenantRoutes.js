const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Configs Gerais
router.get('/settings', tenantController.getTenantSettings);
router.put('/settings', tenantController.updateTenantSettings);

// Equipe
router.get('/users', tenantController.getTeam);
router.post('/users', tenantController.addMember);
router.delete('/users/:id', tenantController.removeMember);
router.put('/users/:id', tenantController.updateMember);

// Campos Personalizados (NOVO)
router.get('/custom-fields', tenantController.getCustomFields);
router.post('/custom-fields', tenantController.saveCustomField);
router.delete('/custom-fields/:id', tenantController.deleteCustomField);

module.exports = router;