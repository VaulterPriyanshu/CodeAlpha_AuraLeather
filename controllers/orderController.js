const prisma = require('../config/db');
const Order = require('../models/Order');

function roundMoney(amount) { return Math.round((Number(amount) + Number.EPSILON) * 100) / 100; }

async function checkout(req, res, next) {
  try {
    const address = {
      name: String(req.body.name || '').trim(),
      street: String(req.body.street || '').trim(),
      city: String(req.body.city || '').trim(),
      zip: String(req.body.zip || '').trim(),
      phone: String(req.body.phone || '').trim()
    };
    if (Object.values(address).some((value) => !value) || address.name.length > 70 || address.street.length > 180 || address.city.length > 100 || address.zip.length > 20 || address.phone.length > 40) {
      return res.status(400).json({ error: 'Complete each shipping field with a valid value.' });
    }
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id }, include: { items: { include: { product: true } } } });
    if (!cart?.items.length) return res.status(400).json({ error: 'Your bag is empty.' });
    const subtotal = roundMoney(cart.items.reduce((sum, item) => sum + item.quantity * item.product.price, 0));
    const shippingFee = subtotal >= 250 ? 0 : 12;
    const estimatedTax = roundMoney(subtotal * 0.08);
    const totalAmount = roundMoney(subtotal + shippingFee + estimatedTax);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const stockChange = await tx.product.updateMany({ where: { id: item.productId, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (!stockChange.count) {
          const error = new Error(`${item.product.title} no longer has enough stock. Please update your bag.`);
          error.code = 'OUT_OF_STOCK';
          throw error;
        }
      }
      const savedOrder = await tx.order.create({
        data: {
          userId: req.user.id, subtotal, shippingFee, estimatedTax, totalAmount,
          shippingAddress: JSON.stringify(address), status: 'Processing', paymentStatus: 'Simulated paid',
          items: { create: cart.items.map((item) => ({ productId: item.productId, productTitle: item.product.title, imageUrl: (() => { try { return JSON.parse(item.product.imageUrls)[0] || ''; } catch { return ''; } })(), priceAtPurchase: item.product.price, quantity: item.quantity, size: item.size, color: item.color })) }
        },
        include: { items: true }
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return savedOrder;
    });

    res.status(201).json({ order: { ...order, shippingAddress: address }, deliveryEstimate: '5–7 business days', paymentNote: 'Payment simulated — no charge was made.' });
  } catch (error) {
    if (error.code === 'OUT_OF_STOCK') return res.status(409).json({ error: error.message });
    next(error);
  }
}

async function listMyOrders(req, res, next) {
  try {
    const orders = await Order.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, include: { items: true } });
    res.json({ orders: orders.map((order) => ({ ...order, shippingAddress: JSON.parse(order.shippingAddress) })) });
  } catch (error) { next(error); }
}

async function getOrder(req, res, next) {
  try {
    const order = await Order.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: { ...order, shippingAddress: JSON.parse(order.shippingAddress) }, deliveryEstimate: '5–7 business days' });
  } catch (error) { next(error); }
}

module.exports = { checkout, listMyOrders, getOrder };
