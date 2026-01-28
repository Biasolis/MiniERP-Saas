const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductDetails);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/adjust', productController.adjustStock); // Rota de ajuste de estoque
router.delete('/:id', productController.deleteProduct);

module.exports = router;