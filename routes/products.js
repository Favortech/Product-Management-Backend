const express = require('express');
const router  = express.Router();
const Product  = require('../models/Product');
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidNumericId(id) {
  const n = parseInt(id, 10);
  return !isNaN(n) && n > 0;
}

function formatValidationError(err) {
  return Object.values(err.errors).map((e) => e.message).join(' ');
}

async function categoryExists(name) {
  return Category.exists({ name });
}

// ─── GET /api/products ────────────────────────────────────────────────────────
// Supports: ?search=, ?category=, ?minPrice=, ?maxPrice=,
//           ?sort=price|-price|title|-title, ?page=, ?limit=
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    const sortMap = { price: 'price', '-price': '-price', title: 'title', '-title': '-title' };
    const sortField = sortMap[sort] || 'id';

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortField).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: products,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const product = await Product.findOne({ id: parseInt(req.params.id, 10) });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/products ───────────────────────────────────────────────────────
// Body: ProductDto { title, price, description, category, image }
router.post('/', async (req, res) => {
  try {
    const { title, price, description, category, image } = req.body;

    if (category) {
      if (!await categoryExists(category)) {
        return res.status(404).json({ error: `Category "${category}" not found.` });
      }
    }

    const product = new Product({ title, price, description, category, image });
    const saved   = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
// Full update — all ProductDto fields required
router.put('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const { title, price, description, category, image } = req.body;

    if (category) {
      if (!await categoryExists(category)) {
        return res.status(404).json({ error: `Category "${category}" not found.` });
      }
    }

    const updated = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id, 10) },
      { $set: { title, price, description, category, image } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/products/:id ──────────────────────────────────────────────────
// Partial update — only provided fields are changed
router.patch('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const allowedFields = ['title', 'price', 'description', 'category', 'image', 'rating'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    if (updates.category) {
      if (!await categoryExists(updates.category)) {
        return res.status(404).json({ error: `Category "${updates.category}" not found.` });
      }
    }

    const updated = await Product.findOneAndUpdate(
      { id: parseInt(req.params.id, 10) },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const deleted = await Product.findOneAndDelete({ id: parseInt(req.params.id, 10) });
    if (!deleted) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json({ message: `Product "${deleted.title}" deleted successfully.`, product: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
