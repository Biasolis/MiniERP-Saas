const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', quoteController.listQuotes);
router.post('/', quoteController.createQuote);
router.get('/:id', quoteController.getQuoteDetails);
router.delete('/:id', quoteController.deleteQuote);
router.post('/:id/convert', quoteController.convertQuote);

module.exports = router;