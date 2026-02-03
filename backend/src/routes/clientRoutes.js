const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// --- Clientes ---

// O erro estava aqui: mudamos de 'listClients' para 'getClients' no controller
router.get('/', clientController.getClients); 

router.post('/', clientController.createClient);
router.get('/:id', clientController.getClientDetails);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);
router.post('/:id/interactions', clientController.addInteraction);

// --- Projetos (CRM) ---

router.get('/:id/projects', clientController.getClientProjects);
router.post('/:id/projects', clientController.createProject);
router.patch('/projects/:projectId', clientController.updateProjectStatus);
router.delete('/projects/:projectId', clientController.deleteProject);

module.exports = router;