const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const controller = require('../controllers/productController');
const router = express.Router();
router.use(authenticate, requireAdmin);
router.post('/products', controller.createAdminProduct);
router.put('/products/:id', controller.updateAdminProduct);
router.delete('/products/:id', controller.deleteAdminProduct);
module.exports = router;
