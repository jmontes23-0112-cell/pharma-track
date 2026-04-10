/**
 * PHARMASTOCK — models/Order.js
 * Mongoose schema for POS transactions / orders
 */

const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  qty:       { type: Number, required: true, min: 1 },
  emoji:     { type: String, default: '💊' },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
  },
  customer: {
    type: String,
    default: 'Walk-in',
    trim: true,
  },
  cashier: {
    type: String,
    default: 'Admin',
  },
  items: [OrderItemSchema],

  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },     // percentage
  tax:      { type: Number, default: 0 },     // amount
  total:    { type: Number, required: true },

  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'ewallet'],
    default: 'cash',
  },
  cashReceived: { type: Number, default: 0 },
  change:       { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['completed', 'refunded', 'void'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

/* ── Indexes ── */
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customer: 1 });

module.exports = mongoose.model('Order', OrderSchema);
