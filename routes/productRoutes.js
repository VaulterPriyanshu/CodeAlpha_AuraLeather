const express = require('express');
const controller = require('../controllers/productController');
const router = express.Router();

router.get('/featured', controller.featuredProducts);
router.get('/', controller.listProducts);
router.get('/:id', controller.getProduct);

module.exports = router;
