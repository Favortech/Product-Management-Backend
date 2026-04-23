require('dotenv').config();
const mongoose = require('mongoose');
const Counter  = require('./models/Counter');
const Category = require('./models/Category');
const Product  = require('./models/Product');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Drop collections so indexes are rebuilt cleanly
    await Counter.collection.drop().catch(() => {});
    await Category.collection.drop().catch(() => {});
    await Product.collection.drop().catch(() => {});
    console.log('Dropped existing collections.');

    console.log('Database reset complete. No seed data inserted.');
    console.log('Use the API to create categories and products:');
    console.log('  POST /api/categories  { "name": "..." }');
    console.log('  POST /api/products    { "title": "...", "price": 0, "category": "...", "description": "...", "image": "..." }');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
