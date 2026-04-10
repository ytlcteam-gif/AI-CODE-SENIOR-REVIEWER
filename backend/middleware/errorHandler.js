/**
 * errorHandler.js — Global Express error handler.
 * Must be registered as the LAST middleware in app (4 parameters).
 *
 * Responsibilities:
 *  - Normalize ALL errors into { success: false, error: string }
 *  - Map known error types to correct HTTP status codes
 *  - Never leak stack traces or internal messages in production
 *
 * Error classification order matters — check most specific first.
 */

/**
 * @param {Error}    err
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} _next  — Required 4th param so Express identifies this as error middleware
 */
const errorHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Always log server-side with full context
  console.error(`[ErrorHandler] ${req.method} ${req.path} — ${err.message}`);
  if (isDev) console.error(err.stack);

  const msg = err.message || '';

  // ── 1. Gemini rate limit (429) ─────────────────────────────────────────────
  // Gemini SDK throws: "GoogleGenerativeAIFetchError: [429 Too Many Requests]"
  // or messages containing "quota", "rate limit", "Resource has been exhausted"
  if (
    err.status === 429 ||
    msg.includes('429') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit') ||
    msg.toLowerCase().includes('resource has been exhausted')
  ) {
    return res.status(429).json({
      success: false,
      error: 'AI rate limit reached. Please wait 60 seconds and try again.',
    });
  }

  // ── 2. Gemini timeout ──────────────────────────────────────────────────────
  if (msg.includes('timed out')) {
    return res.status(504).json({
      success: false,
      error: 'The AI service took too long to respond. Please try again.',
    });
  }

  // ── 3. Gemini empty response ───────────────────────────────────────────────
  if (msg.includes('empty response')) {
    return res.status(502).json({
      success: false,
      error: 'The AI service returned an empty response. Please try again.',
    });
  }

  // ── 4. Gemini API key invalid or missing ───────────────────────────────────
  // SDK throws "API key not valid" or startup check throws with GEMINI_API_KEY
  if (
    msg.includes('GEMINI_API_KEY') ||
    msg.toLowerCase().includes('api key not valid') ||
    msg.toLowerCase().includes('api_key_invalid')
  ) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Contact the administrator.',
    });
  }

  // ── 5. Puppeteer / PDF generation failure ──────────────────────────────────
  if (
    msg.toLowerCase().includes('puppeteer') ||
    msg.toLowerCase().includes('chromium') ||
    msg.toLowerCase().includes('browser')
  ) {
    return res.status(500).json({
      success: false,
      error: 'PDF generation failed. The render engine encountered an error.',
    });
  }

  // ── 6. Request payload too large ──────────────────────────────────────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload is too large.',
    });
  }

  // ── 7. Malformed JSON body ─────────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Request body contains invalid JSON.',
    });
  }

  // ── 8. Generic fallback ────────────────────────────────────────────────────
  return res.status(500).json({
    success: false,
    error: isDev ? msg : 'An unexpected error occurred. Please try again.',
  });
};

module.exports = errorHandler;
