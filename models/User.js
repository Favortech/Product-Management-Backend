const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Counter  = require('./Counter');

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters.'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: { values: ['user', 'admin'], message: 'Role must be "user" or "admin".' },
      default: 'admin',
    },
  },
  {
    versionKey: false,
    id: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Auto-increment numeric id on first save
userSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'user' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    this.id = counter.seq;
  }

  // Hash password only when it has been modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare a plain-text password with the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
