const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/status', posController.getSessionStatus);
router.get('/details', posController.getSessionDetails);
router.get('/history', posController.listHistory); // <--- NOVA ROTA
router.post('/open', posController.openSession);
router.post('/close', posController.closeSession);

module.exports = router;