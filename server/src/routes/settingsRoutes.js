const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rotas de Perfil
router.put('/profile', settingsController.updateProfile);

// Rotas de Categoria
router.post('/categories', settingsController.createCategory);
router.delete('/categories/:id', settingsController.deleteCategory);

module.exports = router;