const Product = require('../models/Product');
const Category = require('../models/Category');

function parseList(value) {
  try { const result = JSON.parse(value || '[]'); return Array.isArray(result) ? result : []; } catch { return []; }
}
function parseObject(value) {
  try { const result = JSON.parse(value || '{}'); return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; }
}

function shapeProduct(product) {
  return {
    ...product,
    sizeOptions: parseList(product.sizeOptions),
    colorOptions: parseList(product.colorOptions),
    imageUrls: parseList(product.imageUrls),
    specifications: parseObject(product.specifications),
    reviews: product.reviews?.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt, name: review.user.name })) || undefined
  };
}

async function listProducts(req, res, next) {
  try {
    const { category, audience, search, minPrice, maxPrice, sort } = req.query;
    const where = {};
    if (category) where.category = { slug: String(category) };
    if (audience && ['men', 'women', 'kids', 'unisex'].includes(String(audience).toLowerCase())) where.audience = String(audience).toLowerCase();
    if (search) where.OR = [
      { title: { contains: String(search).slice(0, 100) } },
      { description: { contains: String(search).slice(0, 100) } },
      { category: { name: { contains: String(search).slice(0, 100) } } }
    ];
    const price = {};
    if (Number.isFinite(Number(minPrice)) && minPrice !== '') price.gte = Math.max(0, Number(minPrice));
    if (Number.isFinite(Number(maxPrice)) && maxPrice !== '') price.lte = Math.max(0, Number(maxPrice));
    if (Object.keys(price).length) where.price = price;
    const orderBy = sort === 'price-low' ? { price: 'asc' } : sort === 'price-high' ? { price: 'desc' } : sort === 'newest' ? { createdAt: 'desc' } : { popularity: 'desc' };
    const products = await Product.findMany({ where, orderBy, include: { category: true }, take: 100 });
    res.json({ products: products.map(shapeProduct) });
  } catch (error) { next(error); }
}

async function featuredProducts(req, res, next) {
  try {
    const products = await Product.findMany({ where: { badge: { not: null } }, orderBy: { popularity: 'desc' }, take: 8, include: { category: true } });
    res.json({ products: products.map(shapeProduct) });
  } catch (error) { next(error); }
}

async function getProduct(req, res, next) {
  try {
    const key = String(req.params.id);
    const product = await Product.findFirst({ where: { OR: [{ id: key }, { slug: key }] }, include: { category: true, reviews: { orderBy: { createdAt: 'desc' }, take: 12, include: { user: { select: { name: true } } } } } });
    if (!product) return res.status(404).json({ error: 'That piece could not be found.' });
    res.json({ product: shapeProduct(product) });
  } catch (error) { next(error); }
}

async function listCategories(req, res, next) {
  try {
    const categories = await Category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } });
    res.json({ categories: categories.map((category) => ({ ...category, productCount: category._count.products })) });
  } catch (error) { next(error); }
}

function stringList(value, name) {
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20));
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value)); } catch { return JSON.stringify(value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20)); }
  }
  return name === 'imageUrls' ? '[]' : '[]';
}

async function createAdminProduct(req, res, next) {
  try {
    const body = req.body;
    const title = String(body.title || '').trim();
    const category = await Category.findFirst({ where: { OR: [{ id: String(body.categoryId || '') }, { slug: String(body.category || '') }] } });
    if (title.length < 3 || !category) return res.status(400).json({ error: 'Provide a product title and valid category.' });
    const slug = String(body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 90);
    const product = await Product.create({ data: {
      title, slug, categoryId: category.id, description: String(body.description || '').slice(0, 3000),
      audience: ['men','women','kids','unisex'].includes(body.audience) ? body.audience : 'unisex',
      price: Math.max(0, Number(body.price) || 0), stockQuantity: Math.max(0, Math.floor(Number(body.stockQuantity) || 0)),
      sizeOptions: stringList(body.sizeOptions, 'sizeOptions'), colorOptions: stringList(body.colorOptions, 'colorOptions'),
      imageUrls: stringList(body.imageUrls, 'imageUrls'), specifications: JSON.stringify(body.specifications && typeof body.specifications === 'object' ? body.specifications : {}), leatherType: String(body.leatherType || 'Full-grain leather').slice(0, 120),
      careInstructions: String(body.careInstructions || 'Wipe with a soft, dry cloth.').slice(0, 500), badge: body.badge ? String(body.badge).slice(0, 30) : null,
      rating: 0, reviewCount: 0
    }, include: { category: true } });
    res.status(201).json({ product: shapeProduct(product) });
  } catch (error) { next(error); }
}

async function updateAdminProduct(req, res, next) {
  try {
    const existing = await Product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });
    const body = req.body;
    const data = {};
    for (const field of ['title','slug','description','leatherType','careInstructions','audience']) if (body[field] !== undefined) data[field] = String(body[field]).slice(0, field === 'description' ? 3000 : 500);
    if (body.price !== undefined) data.price = Math.max(0, Number(body.price) || 0);
    if (body.stockQuantity !== undefined) data.stockQuantity = Math.max(0, Math.floor(Number(body.stockQuantity) || 0));
    if (body.sizeOptions !== undefined) data.sizeOptions = stringList(body.sizeOptions, 'sizeOptions');
    if (body.colorOptions !== undefined) data.colorOptions = stringList(body.colorOptions, 'colorOptions');
    if (body.imageUrls !== undefined) data.imageUrls = stringList(body.imageUrls, 'imageUrls');
    if (body.specifications !== undefined) data.specifications = JSON.stringify(body.specifications && typeof body.specifications === 'object' ? body.specifications : {});
    if (body.badge !== undefined) data.badge = body.badge ? String(body.badge).slice(0, 30) : null;
    if (body.categoryId || body.category) {
      const category = await Category.findFirst({ where: { OR: [{ id: String(body.categoryId || '') }, { slug: String(body.category || '') }] } });
      if (!category) return res.status(400).json({ error: 'Select a valid category.' });
      data.categoryId = category.id;
    }
    const product = await Product.update({ where: { id: existing.id }, data, include: { category: true } });
    res.json({ product: shapeProduct(product) });
  } catch (error) { next(error); }
}

async function deleteAdminProduct(req, res, next) {
  try {
    await Product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product removed from the catalog.' });
  } catch (error) { next(error); }
}

module.exports = { listProducts, featuredProducts, getProduct, listCategories, createAdminProduct, updateAdminProduct, deleteAdminProduct, shapeProduct };
