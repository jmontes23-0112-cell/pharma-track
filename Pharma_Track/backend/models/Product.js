/**
 * PHARMASTOCK — models/Product.js
 * Mongoose schema for pharmacy products/inventory
 */

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  reorder: {
    type: Number,
    default: 10,
    min: 0,
  },
  supplier: {
    type: String,
    default: '',
    trim: true,
  },
  expiry: {
    type: String, // ISO date string
    default: '',
  },
  emoji: {
    type: String,
    default: '💊',
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

/* ── Virtual: stock status ── */
ProductSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.reorder) return 'low_stock';
  return 'in_stock';
});

/* ── Index for fast search ── */
ProductSchema.index({ name: 'text', category: 'text', supplier: 'text' });

module.exports = mongoose.model('Product', ProductSchema);
