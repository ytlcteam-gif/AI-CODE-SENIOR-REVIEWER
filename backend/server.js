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
// Origins are loaded from ALLOWED_ORIGIN (comma-separated) with a hardcoded
// fallback to the production frontend URL so the app works even if the env
// var is misconfigured in the Vercel dashboard.
//
// Supports two formats:
//   Exact:    https://ai-code-senior-reviewe.vercel.app
//   Wildcard: *.vercel.app  (covers all Vercel preview deployments)
//
// CORS must be the FIRST middleware — before routes, before json parser.
// Placing it after routes means OPTIONS preflight requests never get headers.

const FALLBACK_ORIGIN = 'https://ai-code-senior-reviewe.vercel.app';

const rawOrigins = process.env.ALLOWED_ORIGIN
  ? [
      ...process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim()),
      FALLBACK_ORIGIN, // always include fallback even if env var is set
    ]
  : [FALLBACK_ORIGIN, 'http://localhost:3000'];

const isOriginAllowed = (origin) => {
  for (const entry of rawOrigins) {
    if (entry === origin) return true;
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1); // ".vercel.app"
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
};

// Must be registered BEFORE express.json() and all routes
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // curl, Postman, server-to-server
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods:     ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle OPTIONS preflight explicitly — required for credentialed requests
app.options('*', cors());

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
