/**
 * PHARMASTOCK — controllers/inventoryController.js
 * Business logic for product inventory CRUD
 */

const Product = require('../models/Product');

/* ── Helpers ── */
const ok  = (res, data, status = 200)     => res.status(status).json({ success: true,  data });
const err = (res, msg,  status = 400)     => res.status(status).json({ success: false, message: msg });

/* ── GET all products ── */
exports.getAll = async (req, res) => {
  try {
    const { search, category, stock: stockFilter, page = 1, limit = 50 } = req.query;

    const query = { active: true };

    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;

    if (stockFilter === 'out')  query.stock = 0;
    if (stockFilter === 'low')  query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorder'] }] };
    if (stockFilter === 'in')   query.$expr = { $gt: ['$stock', '$reorder'] };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query).skip(skip).limit(Number(limit)).sort({ name: 1 });

    res.json({ success: true, data: products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    err(res, e.message, 500);
  }
};

/* ── GET single product ── */
exports.getOne = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id, active: true });
    if (!product) return err(res, 'Product not found', 404);
    ok(res, product);
  } catch (e) {
    err(res, e.message, 500);
  }
};

/* ── POST create product ── */
exports.create = async (req, res) => {
  try {
    const { name, category, price, stock, reorder, supplier, expiry, emoji } = req.body;

    if (!name || !category || price == null || stock == null) {
      return err(res, 'name, category, price, and stock are required');
    }

    // Auto-generate ID
    const count = await Product.countDocuments();
    const newId = 'P' + String(count + 1).padStart(3, '0');

    const product = new Product({ id: newId, name, category, price, stock, reorder, supplier, expiry, emoji });
    await product.save();

    ok(res, product, 201);
  } catch (e) {
    if (e.code === 11000) return err(res, 'Product ID already exists');
    err(res, e.message, 500);
  }
};

/* ── PUT update product ── */
exports.update = async (req, res) => {
  try {
    const { name, category, price, stock, reorder, supplier, expiry, emoji } = req.body;

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { name, category, price, stock, reorder, supplier, expiry, emoji },
      { new: true, runValidators: true }
    );

    if (!product) return err(res, 'Product not found', 404);
    ok(res, product);
  } catch (e) {
    err(res, e.message, 500);
  }
};

/* ── DELETE product (soft delete) ── */
exports.remove = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { active: false },
      { new: true }
    );
    if (!product) return err(res, 'Product not found', 404);
    ok(res, { message: 'Product deleted' });
  } catch (e) {
    err(res, e.message, 500);
  }
};

/* ── PATCH adjust stock ── */
exports.adjustStock = async (req, res) => {
  try {
    const { delta } = req.body; // positive = restock, negative = deduct
    if (typeof delta !== 'number') return err(res, 'delta must be a number');

    const product = await Product.findOne({ id: req.params.id });
    if (!product) return err(res, 'Product not found', 404);

    const newStock = Math.max(0, product.stock + delta);
    product.stock = newStock;
    await product.save();

    ok(res, product);
  } catch (e) {
    err(res, e.message, 500);
  }
};
