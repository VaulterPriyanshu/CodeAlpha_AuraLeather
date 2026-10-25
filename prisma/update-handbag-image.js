
require('dotenv').config();
const prisma = require('../config/db');

async function main() {
  const imagePath = '/assets/handbag.png';

  await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { slug: 'purses-handbags' }
    });

    const product = await tx.product.findUnique({
      where: { slug: 'keepsake-satchel' }
    });

    if (!category) {
      throw new Error('Purses & Handbags category nahi mili.');
    }

    if (!product) {
      throw new Error('Keepsake Satchel product nahi mila.');
    }

    await tx.category.update({
      where: { slug: 'purses-handbags' },
      data: { imageUrl: imagePath }
    });

    await tx.product.update({
      where: { slug: 'keepsake-satchel' },
      data: { imageUrls: JSON.stringify([imagePath]) }
    });
  });

  console.log('Handbag category aur product image update ho gayi.');
}

main()
  .catch((error) => {
    console.error('Update failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
