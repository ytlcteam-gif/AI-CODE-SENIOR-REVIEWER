/**
 * errorHandler.js — Global Express error handler.
 * Must be registered as the LAST middleware in app (4 parameters).
 *
 * Responsibilities:
 *  - Normalize all errors into a consistent JSON shape
 *  - Never leak stack traces to the client in production
 *  - Handle known error types with specific HTTP status codes
 */

/**
 * @param {Error}    err
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} _next  - Required 4th param so Express identifies this as error middleware
 */
const errorHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Always log server-side
  console.error(`[ErrorHandler] ${req.method} ${req.path} — ${err.message}`);
  if (isDev) console.error(err.stack);

  // ── Known: Gemini timeout ────────────────────────────────────────────────────
  if (err.message?.includes('timed out')) {
    return res.status(504).json({
      success: false,
      error: 'The AI service took too long to respond. Please try again.',
    });
  }

  // ── Known: Gemini empty response ─────────────────────────────────────────────
  if (err.message?.includes('empty response')) {
    return res.status(502).json({
      success: false,
      error: 'The AI service returned an empty response. Please try again.',
    });
  }

  // ── Known: Missing API key (startup misconfiguration) ────────────────────────
  if (err.message?.includes('GEMINI_API_KEY')) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Contact the administrator.',
    });
  }

  // ── Generic fallback ─────────────────────────────────────────────────────────
  return res.status(500).json({
    success: false,
    error: isDev ? err.message : 'An unexpected error occurred. Please try again.',
  });
};

module.exports = errorHandler;
