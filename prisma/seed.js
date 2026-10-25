require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { categories, products } = require('../seeds/seedData');

async function main() {
  const adminEmail = (process.env.AURA_ADMIN_EMAIL || 'admin@auraleather.test').toLowerCase();
  const adminPassword = process.env.AURA_ADMIN_PASSWORD || 'AtelierAdmin26!';
  if (process.env.NODE_ENV === 'production' && (!process.env.AURA_ADMIN_EMAIL || !process.env.AURA_ADMIN_PASSWORD)) {
    throw new Error('Set AURA_ADMIN_EMAIL and AURA_ADMIN_PASSWORD before running the seed in production.');
  }

  const categoryIds = {};
  for (const category of categories) {
    const saved = await prisma.category.upsert({ where: { slug: category.slug }, update: { imageUrl: category.imageUrl }, create: category });
    categoryIds[category.slug] = saved.id;
  }

  for (const product of products) {
    const { category, sizes, colors, image, specifications = {}, ...details } = product;
    await prisma.product.upsert({
      where: { slug: details.slug },
      update: { imageUrls: JSON.stringify([image]), specifications: JSON.stringify(specifications) },
      create: {
        ...details,
        categoryId: categoryIds[category],
        sizeOptions: JSON.stringify(sizes),
        colorOptions: JSON.stringify(colors),
        imageUrls: JSON.stringify([image]),
        specifications: JSON.stringify(specifications),
        careInstructions: 'Wipe with a soft, dry cloth. Let damp leather air-dry naturally, away from direct heat. Condition occasionally with a leather-safe balm.'
      }
    });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({ data: { name: 'Aura Atelier Admin', email: adminEmail, passwordHash, role: 'admin', cart: { create: {} } } });
  } else if (existingAdmin.role !== 'admin') {
    await prisma.user.update({ where: { email: adminEmail }, data: { role: 'admin' } });
  }

  const demoEmail = 'mila@example.test';
  if (!(await prisma.user.findUnique({ where: { email: demoEmail } }))) {
    const passwordHash = await bcrypt.hash('MilaLeather26!', 12);
    await prisma.user.create({ data: { name: 'Mila Hart', email: demoEmail, passwordHash, phone: '555-0142', cart: { create: {} } } });
  }
  const reviewerSpecs = [
    { name: 'Elena Rios', email: 'elena.rios@example.test' },
    { name: 'James Cole', email: 'james.cole@example.test' }
  ];
  for (const reviewer of reviewerSpecs) {
    if (!(await prisma.user.findUnique({ where: { email: reviewer.email } }))) {
      const passwordHash = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 12);
      await prisma.user.create({ data: { ...reviewer, passwordHash, cart: { create: {} } } });
    }
  }
  const reviewerUsers = await prisma.user.findMany({ where: { email: { in: [demoEmail, ...reviewerSpecs.map((item) => item.email)] } } });
  const reviewerByEmail = Object.fromEntries(reviewerUsers.map((user) => [user.email, user]));
  const savedProducts = await prisma.product.findMany({ select: { id: true, slug: true } });
  const comments = [
    'The finish is beautiful in person. Thoughtful construction and a lovely feel from the first day.',
    'The details are considered and the leather already feels like it will age beautifully.',
    'A favorite from the first week. The stitching and material feel wonderfully well made.'
  ];
  for (const product of savedProducts) {
    const reviewers = [reviewerByEmail[demoEmail], reviewerByEmail['elena.rios@example.test'], reviewerByEmail['james.cole@example.test']];
    for (let index = 0; index < reviewers.length; index += 1) {
      await prisma.review.upsert({
        where: { productId_userId: { productId: product.id, userId: reviewers[index].id } },
        update: {},
        create: { productId: product.id, userId: reviewers[index].id, rating: index === 1 ? 4 : 5, comment: comments[index] }
      });
    }
    const aggregate = await prisma.review.aggregate({ where: { productId: product.id }, _avg: { rating: true }, _count: { _all: true } });
    await prisma.product.update({ where: { id: product.id }, data: { rating: Number((aggregate._avg.rating || 0).toFixed(1)), reviewCount: aggregate._count._all } });
  }
  console.log(`Seeded ${categories.length} categories and ${products.length} products. Development admin: ${adminEmail}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
