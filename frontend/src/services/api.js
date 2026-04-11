/**
 * api.js — Backend communication layer.
 *
 * Base URL resolution:
 *   Local dev:   VITE_API_URL is unset → falls back to '/api'
 *               Vite proxy (vite.config.js) forwards /api/* → localhost:5000
 *   Production:  VITE_API_URL=https://your-backend.railway.app/api
 *               Set this in Vercel → Project Settings → Environment Variables
 *
 * All HTTP calls live here. Components never call fetch/axios directly.
 */

import axios from 'axios';

// Strip any accidental trailing slash — prevents double-slash in URLs like //review
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// ─── Shared JSON client ───────────────────────────────────────────────────────
const client = axios.create({
  baseURL: API_BASE,
  timeout: 35_000, // Slightly over backend's AI timeout (30s) to catch its error first
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Submit code for AI review.
 *
 * @param {string} code  - Source code to review
 * @param {string} mode  - "beginner" | "senior"
 * @returns {Promise<{ success: boolean, mode: string, review: string }>}
 * @throws {Error} with a user-facing message property
 */
export const submitReview = async (code, mode) => {
  try {
    const response = await client.post('/review', { code, mode });
    return response.data;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      (err.code === 'ECONNABORTED' ? 'Request timed out. The AI is taking too long.' : null) ||
      (err.message === 'Network Error'
        ? 'Cannot reach the server. Is the backend running?'
        : null) ||
      'Something went wrong. Please try again.';

    throw new Error(message);
  }
};

/**
 * Request a PDF audit report from the backend and trigger a browser download.
 *
 * Uses a direct axios call with responseType: 'blob' — the shared client
 * cannot be reused here because binary responses must not be parsed as JSON.
 *
 * @param {string} code    - Original source code
 * @param {string} review  - AI review markdown text
 * @param {string} mode    - "beginner" | "senior"
 * @returns {Promise<void>} Resolves when download is triggered
 * @throws {Error} with a user-facing message
 */
export const downloadPdf = async (code, review, mode) => {
  try {
    const response = await axios.post(
      `${API_BASE}/generate-pdf`,
      { code, review, mode },
      {
        responseType: 'blob',  // Critical: keeps response as binary — do not remove
        timeout:      60_000,  // PDF generation is slower than review — allow 60s
      }
    );

    const url      = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const anchor   = document.createElement('a');
    anchor.href    = url;
    anchor.download = 'code-review-audit.pdf';
    anchor.click();

    // Revoke immediately — prevents memory leak from dangling object URLs
    URL.revokeObjectURL(url);

  } catch (err) {
    // Blob error responses can't be read as JSON directly — parse manually
    let message = 'Failed to generate PDF. Please try again.';

    if (err.response?.data instanceof Blob) {
      try {
        const text   = await err.response.data.text();
        const parsed = JSON.parse(text);
        message      = parsed.error || message;
      } catch {
        // Blob wasn't valid JSON — use default message
      }
    } else if (err.code === 'ECONNABORTED') {
      message = 'PDF generation timed out. Try again.';
    } else if (err.message === 'Network Error') {
      message = 'Cannot reach the server. Is the backend running?';
    }

    throw new Error(message);
  }
};
