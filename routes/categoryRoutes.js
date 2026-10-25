const express = require('express');
const { listCategories } = require('../controllers/productController');
const router = express.Router();
router.get('/', listCategories);
module.exports = router;
