/**
 * reviewRoutes.js — API route definitions.
 * Middleware is applied per-route for clear intent.
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const reviewController = require('../controllers/reviewController');
const pdfController    = require('../controllers/pdfController');
const { validateReviewRequest, validatePdfRequest } = require('../middleware/validateRequest');

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// Applied only to /review to protect Gemini API quota.
const reviewLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000, // 1 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait before submitting again.',
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/review
 * Accepts code + mode, returns structured AI review.
 */
router.post('/review', reviewLimiter, validateReviewRequest, reviewController.handleReview);

/**
 * POST /api/generate-pdf
 * Accepts code + review + mode, streams a PDF binary response.
 */
router.post('/generate-pdf', validatePdfRequest, pdfController.handleGeneratePdf);

module.exports = router;
