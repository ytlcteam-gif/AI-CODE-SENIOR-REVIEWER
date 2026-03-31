/**
 * server.js — Entry point for the AI Code Reviewer Express server.
 * Stateless design: no database, no sessions.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const reviewRoutes = require('./routes/reviewRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Core Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50kb' })); // Block oversized payloads

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', reviewRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ─── Global Error Handler (must be registered last) ───────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT} — mode: ${process.env.NODE_ENV}`);
});

module.exports = app;
