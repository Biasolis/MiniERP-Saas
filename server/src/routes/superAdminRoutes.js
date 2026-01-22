// server/src/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const superAdminController = require('../controllers/superAdminController');

// Todas as rotas aqui requerem Login E Role SUPER_ADMIN
router.use(authMiddleware);
router.use(checkRole(['SUPER_ADMIN']));

// Rotas de Gestão de Empresas
router.get('/companies', superAdminController.listCompanies);
router.patch('/companies/:id/plan', superAdminController.updateCompanyPlan);
router.patch('/companies/:id/status', superAdminController.toggleCompanyStatus);

module.exports = router;