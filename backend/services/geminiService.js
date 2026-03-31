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
