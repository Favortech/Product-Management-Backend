const express = require('express');
const router  = express.Router();
const Category = require('../models/Category');
const Product  = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidNumericId(id) {
  const n = parseInt(id, 10);
  return !isNaN(n) && n > 0;
}

function formatValidationError(err) {
  return Object.values(err.errors).map((e) => e.message).join(' ');
}

// ─── GET /api/categories ──────────────────────────────────────────────────────
// Returns all categories sorted by id
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ id: 1 });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/categories/:id ──────────────────────────────────────────────────
// Returns a single category by numeric id
router.get('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }
  try {
    const category = await Category.findOne({ id: parseInt(req.params.id, 10) });
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/categories ─────────────────────────────────────────────────────
// Body: CategoryDto { name }
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    const saved    = await category.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A category with that name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/categories/:id ──────────────────────────────────────────────────
// Full update — replaces category name
router.put('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Field "name" is required.' });

    const updated = await Category.findOneAndUpdate(
      { id: parseInt(req.params.id, 10) },
      { $set: { name } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Category not found.' });
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A category with that name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/categories/:id ────────────────────────────────────────────────
// Partial update
router.patch('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Field "name" is required.' });

    const updated = await Category.findOneAndUpdate(
      { id: parseInt(req.params.id, 10) },
      { $set: { name } },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: 'Category not found.' });
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: formatValidationError(err) });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A category with that name already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────
// Blocked if any products are still assigned to this category
router.delete('/:id', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }
  try {
    const category = await Category.findOne({ id: parseInt(req.params.id, 10) });
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${productCount} product(s) are still assigned to this category.`,
      });
    }

    await category.deleteOne();
    res.status(200).json({ message: `Category "${category.name}" deleted successfully.`, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/categories/:id/products ─────────────────────────────────────────
// All products belonging to a category
router.get('/:id/products', async (req, res) => {
  if (!isValidNumericId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid category ID.' });
  }
  try {
    const category = await Category.findOne({ id: parseInt(req.params.id, 10) });
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    const products = await Product.find({ category: category.name }).sort({ id: 1 });
    res.status(200).json({ category, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
