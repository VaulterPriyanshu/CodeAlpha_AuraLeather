const prisma = require('../config/db');
const { shapeProduct } = require('./productController');

async function getCart(req, res, next) {
  try {
    const cart = await prisma.cart.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id }, include: { items: { include: { product: { include: { category: true } }, } } } });
    const items = cart.items.map((item) => ({ id: item.id, productId: item.productId, quantity: item.quantity, size: item.size, color: item.color, product: shapeProduct(item.product), lineTotal: Number((item.quantity * item.product.price).toFixed(2)) }));
    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    res.json({ items, subtotal, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) });
  } catch (error) { next(error); }
}

async function addItem(req, res, next) {
  try {
    const productId = String(req.body.productId || '');
    const quantity = Math.floor(Number(req.body.quantity) || 1);
    const size = String(req.body.size || '');
    const color = String(req.body.color || '');
    if (quantity < 1 || quantity > 10) return res.status(400).json({ error: 'Choose a quantity between 1 and 10.' });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    if (product.stockQuantity < quantity) return res.status(409).json({ error: 'There is not enough stock for that quantity.' });
    const cart = await prisma.cart.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, size, color } });
    if (existing) {
      if (existing.quantity + quantity > product.stockQuantity) return res.status(409).json({ error: 'There is not enough stock for that quantity.' });
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, size, color } });
    }
    res.status(201).json({ message: `${product.title} added to your bag.` });
  } catch (error) { next(error); }
}

async function updateItem(req, res, next) {
  try {
    const quantity = Math.floor(Number(req.body.quantity));
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, cart: { userId: req.user.id } }, include: { product: true } });
    if (!item) return res.status(404).json({ error: 'Cart item not found.' });
    if (quantity < 1 || quantity > item.product.stockQuantity) return res.status(400).json({ error: 'Choose a quantity within the available stock.' });
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    res.json({ message: 'Bag updated.' });
  } catch (error) { next(error); }
}

async function removeItem(req, res, next) {
  try {
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.itemId, cart: { userId: req.user.id } } });
    if (!item) return res.status(404).json({ error: 'Cart item not found.' });
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.json({ message: 'Item removed from your bag.' });
  } catch (error) { next(error); }
}

async function clearCart(req, res, next) {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.json({ message: 'Your bag is clear.' });
  } catch (error) { next(error); }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
