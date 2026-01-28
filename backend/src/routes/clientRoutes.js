const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientDetails); // Rota do CRM Detalhado
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

// Rota para adicionar histórico no CRM
router.post('/:id/interactions', clientController.addInteraction);

module.exports = router;