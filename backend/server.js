/**
 * server.js — Entry point for the AI Code Reviewer Express server.
 * Stateless design: no database, no sessions.
 */

require('dotenv').config();

const express = require('express');
const reviewRoutes = require('./routes/reviewRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Manual headers instead of the cors library — more predictable on Vercel
// serverless where the cors library's function-based origin has known quirks.
//
// Policy:
//   - Any *.vercel.app subdomain is allowed (covers all preview + prod URLs).
//   - localhost variants are allowed for local dev.
//   - Additional origins can be injected via ALLOWED_ORIGIN (comma-separated).
//
// MUST be the FIRST middleware — OPTIONS preflight must be answered before
// express.json() or any route handler runs.

const EXTRA_ORIGINS = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : [];

const EXPLICIT_ORIGINS = new Set([
  'https://ai-code-senior-reviewe.vercel.app', // production frontend — hardcoded fallback
  'http://localhost:3000',
  'http://localhost:5173',
  ...EXTRA_ORIGINS,
]);

app.use((req, res, next) => {
  const origin = req.headers.origin || '';

  // Allow if: no origin (curl/Postman), any *.vercel.app, or explicit list
  const isAllowed =
    !origin ||
    origin.endsWith('.vercel.app') ||
    EXPLICIT_ORIGINS.has(origin);

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight 24h

  // Answer OPTIONS preflight immediately — no route handler needed
  if (req.method === 'OPTIONS') return res.status(204).end();

  next();
});

// ─── Core Middleware ───────────────────────────────────────────────────────────
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
// Guarded: Vercel runs this file as a serverless function and manages its own
// HTTP server. app.listen() is only called in local dev / traditional hosting.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT} — mode: ${process.env.NODE_ENV}`);
  });
}

module.exports = app;
