/**
 * PHARMASTOCK — routes/inventoryRoutes.js
 * REST routes for product inventory
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/inventoryController');

// GET  /api/inventory         — list all products (with search/filter)
router.get('/',        ctrl.getAll);

// GET  /api/inventory/:id     — get single product
router.get('/:id',     ctrl.getOne);

// POST /api/inventory         — create product
router.post('/',       ctrl.create);

// PUT  /api/inventory/:id     — update product
router.put('/:id',     ctrl.update);

// DELETE /api/inventory/:id   — delete product
router.delete('/:id',  ctrl.remove);

// PATCH /api/inventory/:id/stock — adjust stock delta
router.patch('/:id/stock', ctrl.adjustStock);

module.exports = router;
