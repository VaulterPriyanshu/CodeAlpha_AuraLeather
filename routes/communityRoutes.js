const express = require('express');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/newsletter', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ error: 'Enter a valid email address.' });
    await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
    res.status(201).json({ message: 'You are on the list. Look out for a little note from the atelier.' });
  } catch (error) { next(error); }
});

router.post('/reviews/:productId', authenticate, async (req, res, next) => {
  try {
    const rating = Math.floor(Number(req.body.rating));
    const comment = String(req.body.comment || '').trim();
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Choose a rating from 1 to 5 stars.' });
    if (comment.length < 8 || comment.length > 800) return res.status(400).json({ error: 'Write a review between 8 and 800 characters.' });
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const review = await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: req.user.id } },
      update: { rating, comment },
      create: { productId: product.id, userId: req.user.id, rating, comment }
    });
    const aggregate = await prisma.review.aggregate({ where: { productId: product.id }, _avg: { rating: true }, _count: { _all: true } });
    await prisma.product.update({ where: { id: product.id }, data: { rating: Number((aggregate._avg.rating || 0).toFixed(1)), reviewCount: aggregate._count._all } });
    res.status(201).json({ review: { ...review, name: req.user.name }, message: 'Thank you for sharing your experience.' });
  } catch (error) { next(error); }
});

module.exports = router;
