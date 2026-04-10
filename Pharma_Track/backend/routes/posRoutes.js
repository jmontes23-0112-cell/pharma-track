/**
 * PHARMASTOCK — routes/posRoutes.js
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/posController');

// POST /api/pos/checkout    — process a sale
router.post('/checkout',  ctrl.checkout);

// GET  /api/pos/orders      — list orders
router.get('/orders',     ctrl.getOrders);

// GET  /api/pos/orders/:id  — get single order
router.get('/orders/:id', ctrl.getOrder);

// POST /api/pos/void/:id    — void an order
router.post('/void/:id',  ctrl.voidOrder);

module.exports = router;
