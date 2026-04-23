const mongoose = require('mongoose');
const Counter  = require('./Counter');

const ratingSchema = new mongoose.Schema(
  {
    rate: {
      type: Number,
      default: 0,
      min: [0, 'Rating rate cannot be negative.'],
      max: [5, 'Rating rate cannot exceed 5.'],
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative.'],
      validate: { validator: Number.isInteger, message: 'Rating count must be a whole number.' },
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    title: {
      type: String,
      required: [true, 'Product title is required.'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters.'],
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price cannot be negative.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: ratingSchema,
      default: () => ({ rate: 0, count: 0 }),
    },
  },
  {
    versionKey: false,
    id: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

productSchema.index({ price: 1 });
productSchema.index({ category: 1 });
productSchema.index({ title: 'text', description: 'text' });

productSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'product' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id = counter.seq;
  }
});

module.exports = mongoose.model('Product', productSchema);
