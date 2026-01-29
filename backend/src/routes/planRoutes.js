const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
// const authMiddleware = require('../middlewares/authMiddleware'); 
// Descomente a linha acima se quiser proteger as rotas de planos (ex: só SuperAdmin)

router.get('/', planController.listPlans);
router.post('/', planController.createPlan);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);

module.exports = router;