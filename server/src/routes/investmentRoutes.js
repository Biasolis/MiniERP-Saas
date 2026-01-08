const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', investmentController.list);
router.post('/', investmentController.create);
router.patch('/:id/value', investmentController.updateValue);
router.delete('/:id', investmentController.delete);

module.exports = router;