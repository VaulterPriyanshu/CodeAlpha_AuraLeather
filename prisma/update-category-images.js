
require('dotenv').config();

const prisma = require('../config/db');
const { categories } = require('../seeds/seedData');

async function main() {
  for (const item of categories) {
    const category = await prisma.category.findUnique({
      where: { slug: item.slug },
      select: { id: true, name: true }
    });

    if (!category) {
      console.log(`Skipped: ${item.slug} (category nahi mili)`);
      continue;
    }

    await prisma.category.update({
      where: { id: category.id },
      data: { imageUrl: item.imageUrl }
    });

    console.log(`Updated: ${category.name} -> ${item.imageUrl}`);
  }

  console.log('Category images update complete!');
}

main()
  .catch((error) => {
    console.error('Update failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
