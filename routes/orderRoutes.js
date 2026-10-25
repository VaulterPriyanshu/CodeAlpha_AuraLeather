const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const controller = require('../controllers/orderController');
const router = express.Router();
router.use(authenticate);
router.post('/checkout', controller.checkout);
router.get('/', controller.listMyOrders);
router.get('/:id', controller.getOrder);
module.exports = router;
