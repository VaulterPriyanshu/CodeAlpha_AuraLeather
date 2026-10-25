const prisma = require('../config/db');

// Prisma schema.prisma defines this model; export its generated data-access delegate.
module.exports = prisma.product;
