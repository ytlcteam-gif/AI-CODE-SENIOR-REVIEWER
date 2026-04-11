/**
 * geminiService.js
 * Wraps the Google Generative AI SDK for Gemini 1.5 Flash.
 *
 * Responsibilities:
 *  - Initialize the Gemini client from environment config
 *  - Send prompts and return raw text responses
 *  - Enforce a hard timeout to prevent hanging requests
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Config ───────────────────────────────────────────────────────────────────
const MODEL_NAME   = process.env.GEMINI_MODEL         || 'gemini-1.5-flash';
const TIMEOUT_MS   = parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 30_000;

// ─── Validate API Key at Startup ──────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    '[geminiService] GEMINI_API_KEY is not set. Add it to your .env file.'
  );
}

// ─── Client Initialization ────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Sends a prompt to Gemini and returns the response text.
 * Races against a timeout to prevent indefinite hangs.
 *
 * @param {string} prompt - The fully-built prompt string
 * @returns {Promise<string>} Raw AI response text
 * @throws Will throw if the request times out or Gemini returns an error
 */
const generateReview = async (prompt) => {
  const aiRequest = model
    .generateContent(prompt)
    .then((result) => {
      const text = result.response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Gemini returned an empty response.');
      }
      return text;
    })
    .catch((err) => {
      // Log the full SDK error to Vercel function logs so the real cause is
      // visible in the dashboard even when production hides it from the client.
      console.error('[geminiService] Gemini SDK error:', err.message);
      console.error('[geminiService] Error status:', err.status ?? 'n/a');
      console.error('[geminiService] Error details:', JSON.stringify(err.errorDetails ?? err, null, 2));

      const raw = err.message || '';

      // Re-throw with a clean message errorHandler can pattern-match
      if (raw.includes('429') || raw.toLowerCase().includes('quota') || raw.toLowerCase().includes('resource has been exhausted')) {
        throw new Error(`Gemini rate limit: ${raw}`);
      }
      if (
        raw.toLowerCase().includes('api key') ||
        raw.toLowerCase().includes('api_key') ||
        raw.toLowerCase().includes('invalid_argument') ||
        raw.toLowerCase().includes('api key not valid')
      ) {
        throw new Error(`Gemini API key invalid: ${raw}`);
      }
      if (raw.toLowerCase().includes('not found') || raw.toLowerCase().includes('404')) {
        throw new Error(`Gemini model not found: ${raw}`);
      }
      // Pass through all other SDK errors with the original message preserved
      throw new Error(`Gemini error: ${raw}`);
    });

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('Gemini API request timed out.')),
      TIMEOUT_MS
    )
  );

  // First to resolve wins — timeout kills a hanging AI call
  return Promise.race([aiRequest, timeout]);
};

module.exports = { generateReview };
