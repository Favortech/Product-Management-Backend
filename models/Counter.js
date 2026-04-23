const mongoose = require('mongoose');

// Stores auto-increment counters for each collection
const counterSchema = new mongoose.Schema({
  _id:  { type: String, required: true },   // e.g. 'category', 'product'
  seq:  { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
