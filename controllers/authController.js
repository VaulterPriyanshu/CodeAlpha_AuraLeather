const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const User = require('../models/User');
const { getJwtSecret } = require('../middleware/authMiddleware');

function cookieOptions() {
  const localHttp = process.env.COOKIE_MODE === 'local-http';
  return {
    httpOnly: true,
    secure: !localHttp,
    sameSite: localHttp ? 'lax' : 'none',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, address: user.address || '', phone: user.phone || '' };
}

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '7d' });
  res.cookie('aura_session', token, cookieOptions());
}

async function register(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 70) return res.status(400).json({ error: 'Enter your full name (2–70 characters).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await User.findUnique({ where: { email } })) return res.status(409).json({ error: 'An account with that email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ data: { name, email, passwordHash, cart: { create: {} } } });
    issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
}

function logout(req, res) {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie('aura_session', options);
  res.json({ message: 'You have been signed out.' });
}

async function me(req, res, next) {
  try {
    const [user, orderCount, cart] = await Promise.all([
      User.findUnique({ where: { id: req.user.id } }),
      prisma.order.count({ where: { userId: req.user.id } }),
      prisma.cart.findUnique({ where: { userId: req.user.id }, include: { items: true } })
    ]);
    res.json({ user: publicUser(user), orderCount, cartCount: (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0) });
  } catch (error) { next(error); }
}

async function updateProfile(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();
    if (name.length < 2 || name.length > 70) return res.status(400).json({ error: 'Enter your full name (2–70 characters).' });
    if (phone.length > 40 || address.length > 300) return res.status(400).json({ error: 'Phone or address is too long.' });
    const user = await User.update({ where: { id: req.user.id }, data: { name, phone: phone || null, address: address || null } });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
}

module.exports = { register, login, logout, me, updateProfile };
