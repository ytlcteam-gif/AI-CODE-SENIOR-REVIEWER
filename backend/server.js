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

// ─── CORS ─────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGIN accepts comma-separated values. Two formats are supported:
//
//   1. Exact origin:   https://ai-code-reviewer.vercel.app
//   2. Wildcard:       *.vercel.app  (matches any subdomain)
//
// Wildcard format covers Vercel preview deployments, which change URL on
// every push (e.g. ai-code-reviewer-git-feature-abc123.vercel.app).
// Without this, preview deployments are blocked by CORS — a common failure.
//
// Production example:
//   ALLOWED_ORIGIN=https://ai-code-reviewer.vercel.app,*.vercel.app
//
// Responsibility: CORS is a server-level concern — configured here, not in routes.
const rawOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

/**
 * Returns true if `origin` is permitted by the allowlist.
 * Supports exact matches and wildcard subdomain patterns (*.domain.com).
 *
 * @param {string} origin
 * @returns {boolean}
 */
const isOriginAllowed = (origin) => {
  for (const entry of rawOrigins) {
    // Exact match
    if (entry === origin) return true;
    // Wildcard: *.domain.com — matches any https://sub.domain.com
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1); // ".domain.com"
      if (origin.endsWith(suffix))  return true;
    }
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (curl, Postman, server-to-server)
      if (!origin)              return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      // Return null (blocked) — do NOT throw. Throwing routes to error handler
      // and returns 500. Blocked CORS should silently return no header, letting
      // the browser show its own CORS error.
      return callback(null, false);
    },
    methods:     ['GET', 'POST'],
    credentials: false,
  })
);

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
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT} — mode: ${process.env.NODE_ENV}`);
});

module.exports = app;
