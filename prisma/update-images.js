
require('dotenv').config();

const prisma = require('../config/db');
const { products } = require('../seeds/seedData');

async function main() {
  const updates = [];

  for (const item of products) {
    const product = await prisma.product.findUnique({
      where: { slug: item.slug },
      select: { id: true, title: true, slug: true }
    });

    if (!product) {
      console.log(`Skipped (DB mein nahi mila): ${item.slug}`);
      continue;
    }

    updates.push({
      id: product.id,
      title: product.title,
      imageUrls: JSON.stringify([item.image])
    });
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.product.update({
        where: { id: item.id },
        data: { imageUrls: item.imageUrls }
      })
    )
  );

  console.log(`\nSuccessfully updated ${updates.length} product images.`);
  updates.forEach((item) => console.log(`- ${item.title}`));
}

main()
  .catch((error) => {
    console.error('Image update failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
