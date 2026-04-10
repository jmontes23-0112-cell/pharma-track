/**
 * PHARMASTOCK — server.js
 * Express REST API Server
 * Run: node server.js
 */

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const mongoose   = require('mongoose'); // or swap for mysql2

// Routes
const inventoryRoutes = require('./routes/inventoryRoutes');
const posRoutes       = require('./routes/posRoutes');
const reportRoutes    = require('./routes/reportRoutes');
const userRoutes      = require('./routes/userRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Serve frontend static files ── */
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── API Routes ── */
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos',       posRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/auth',      userRoutes);

/* ── Root ── */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

/* ── MongoDB Connection ── */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmastock';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 PharmaStock server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    // Start without DB for development/demo
    app.listen(PORT, () => {
      console.log(`⚠️  Running without DB — http://localhost:${PORT}`);
    });
  });

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
