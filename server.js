require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const prisma = require('./config/db');
const requestGuard = require('./middleware/requestGuard');

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'public');
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requestGuard);

app.get('/health', async (req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.status(200).json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'not-ready' }); }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api', require('./routes/communityRoutes'));

app.use(express.static(publicDir, { index: 'index.html', maxAge: '1h', etag: true }));
const pageFiles = {
  '/shop': 'shop.html', '/product': 'product.html', '/cart': 'cart.html',
  '/checkout': 'checkout.html', '/account': 'account.html', '/admin': 'admin.html',
  '/about': 'about.html', '/contact': 'contact.html'
};
for (const [route, file] of Object.entries(pageFiles)) {
  if (route === '/product') app.get('/product/:id', (req, res) => res.sendFile(path.join(publicDir, file)));
  app.get(route, (req, res) => res.sendFile(path.join(publicDir, file)));
}
app.get('/product', (req, res) => res.sendFile(path.join(publicDir, 'product.html')));
app.get('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((req, res) => res.status(404).sendFile(path.join(publicDir, '404.html'), (error) => {
  if (error) res.status(404).send('Page not found.');
}));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error.code === 'P2002') return res.status(409).json({ error: 'That value is already in use.' });
  if (error.code === 'P2025') return res.status(404).json({ error: 'That record could not be found.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`Aura Leather Co. listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
});
