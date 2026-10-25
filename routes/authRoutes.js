const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/authMiddleware');
const controller = require('../controllers/authController');

const router = express.Router();
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 70 }).withMessage('Enter your full name.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters.'),
  validate
], controller.register);
router.post('/login', [body('email').trim().isEmail().withMessage('Enter a valid email address.'), body('password').isString().notEmpty().withMessage('Enter your password.'), validate], controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, controller.updateProfile);

module.exports = router;
