const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', entryController.createEntry);
router.get('/', entryController.getEntries);
router.get('/:id', entryController.getEntryDetails);
router.delete('/:id', entryController.deleteEntry); // Rota de exclusão

module.exports = router;