require('dotenv').config();

if (!process.env.AURA_DATABASE_URL) {
  process.env.AURA_DATABASE_URL = 'file:./dev.db';
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
});

module.exports = prisma;
