const mongoose = require('mongoose');
const Counter  = require('./Counter');

// Matches:  export interface Category { id: number; name: string; }
const categorySchema = new mongoose.Schema(
  {
    id:   { type: Number, unique: true },   // numeric id exposed to API clients
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters.'],
      maxlength: [50, 'Category name cannot exceed 50 characters.'],
      unique: true,
    },
  },
  {
    versionKey: false,
    id: false,          // disable Mongoose default id virtual (conflicts with our field)
    toJSON: {
      transform(doc, ret) {
        delete ret._id;   // hide internal MongoDB _id; expose numeric id only
        return ret;
      },
    },
  }
);

// ─── Auto-increment id on create ──────────────────────────────────────────────
categorySchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'category' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id = counter.seq;
  }
});

module.exports = mongoose.model('Category', categorySchema);

