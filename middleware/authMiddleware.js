const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured for production.');
  }
  return 'aura-local-development-secret-change-before-deployment';
}

async function authenticate(req, res, next) {
  const token = req.cookies?.aura_session || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Your session is no longer valid.' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, getJwtSecret };
