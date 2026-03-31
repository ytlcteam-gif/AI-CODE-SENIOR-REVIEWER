/**
 * validateRequest.js
 * Input validation middleware — enforces contract at the system boundary.
 * Never trust client data. All validation happens here before controllers run.
 */

const MAX_CODE_LENGTH = parseInt(process.env.MAX_CODE_LENGTH, 10) || 10_000;
const VALID_MODES     = ['beginner', 'senior'];

/**
 * Validates the body of POST /api/review.
 *
 * Rules:
 *  - `code`  → required, non-empty string, max MAX_CODE_LENGTH chars
 *  - `mode`  → required, must be "beginner" or "senior"
 */
const validateReviewRequest = (req, res, next) => {
  const { code, mode } = req.body;

  // ── Validate: code ──────────────────────────────────────────────────────────
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "code" is required and must be a non-empty string.',
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Code exceeds the maximum allowed length of ${MAX_CODE_LENGTH} characters.`,
    });
  }

  // ── Validate: mode ──────────────────────────────────────────────────────────
  if (!mode || !VALID_MODES.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: `Field "mode" is required and must be one of: ${VALID_MODES.join(', ')}.`,
    });
  }

  next();
};

/**
 * Validates the body of POST /api/generate-pdf.
 *
 * Responsibility Decision:
 * - Validation belongs at: API Layer (here), not inside pdfController.
 * - Reason: pdfController's contract is "generate a PDF from valid inputs".
 *   Mixing transport validation into a generation function is an
 *   ARCHITECTURAL ISSUE — it couples HTTP concerns to business logic.
 *
 * Rules:
 *  - `code`   → required, non-empty string, max MAX_CODE_LENGTH chars
 *  - `review` → required, non-empty string (AI-generated, but still validated)
 *  - `mode`   → required, must be "beginner" or "senior"
 */
const validatePdfRequest = (req, res, next) => {
  const { code, review, mode } = req.body;

  // ── Validate: code ──────────────────────────────────────────────────────────
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "code" is required and must be a non-empty string.',
    });
  }

  if (code.length > MAX_CODE_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Code exceeds the maximum allowed length of ${MAX_CODE_LENGTH} characters.`,
    });
  }

  // ── Validate: review ────────────────────────────────────────────────────────
  if (!review || typeof review !== 'string' || review.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "review" is required and must be a non-empty string.',
    });
  }

  // ── Validate: mode ──────────────────────────────────────────────────────────
  if (!mode || !VALID_MODES.includes(mode)) {
    return res.status(400).json({
      success: false,
      error: `Field "mode" is required and must be one of: ${VALID_MODES.join(', ')}.`,
    });
  }

  next();
};

module.exports = { validateReviewRequest, validatePdfRequest };
