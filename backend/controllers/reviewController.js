/**
 * reviewController.js
 * Orchestrates the review flow: selects prompt strategy, calls AI, returns response.
 */

const geminiService = require('../services/geminiService');

// ─── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * Builds the Beginner Mode prompt.
 * Teaching-focused: requests scorecard, pitfalls, and TWO solutions.
 * @param {string} code
 * @returns {string}
 */
const buildBeginnerPrompt = (code) => `
You are a Senior Engineering Mentor reviewing a junior developer's code.
Use BEGINNER MODE: teaching-first, step-by-step reasoning.

---
CODE TO REVIEW:
\`\`\`
${code}
\`\`\`
---

Respond using EXACTLY this format:

## Executive Summary
2-3 sentences on overall quality and production readiness.

## Engineering Scorecard
| Metric | Score (0-100) | Note |
|---|---|---|
| Logic & Correctness | X/100 | brief note |
| Performance (Big-O) | X/100 | brief note |
| Security & Safety | X/100 | brief note |
| Readability & Style | X/100 | brief note |

## The Good
- What is done correctly.

## Critical Issues
- Bugs, security flaws, or breaking logic. Include WHY and real-world impact.

## Junior Pitfalls Found
- List beginner anti-patterns detected (magic numbers, generic names, deep nesting, etc.)

## Mentorship & Improvements
For each issue: explain the technical reason and real-world impact of fixing it.

## Complexity Analysis
- Time Complexity:
- Space Complexity:
- Bottleneck:

## Solution 1 — Readable (Clarity-First)
Provide a clean, well-commented solution that prioritizes readability.
Include docstrings/comments explaining the logic.

## Solution 2 — Optimal (Performance-First)
Provide the most performant solution. Use advanced techniques where justified.
Annotate with Big-O complexity. Include docstrings.
`.trim();

/**
 * Builds the Senior Mode prompt.
 * Direct and strict: no hand-holding, production-grade output only.
 * @param {string} code
 * @returns {string}
 */
const buildSeniorPrompt = (code) => `
You are a Tech Lead reviewing a Pull Request. Be direct and strict.
Use SENIOR MODE: no unnecessary explanation, focus on production risks.

---
CODE TO REVIEW:
\`\`\`
${code}
\`\`\`
---

Respond using EXACTLY this format:

## Executive Summary
2-3 sentences. Production readiness verdict only.

## Engineering Scorecard
| Metric | Score (0-100) | Note |
|---|---|---|
| Logic & Correctness | X/100 | |
| Performance (Big-O) | X/100 | |
| Security & Safety | X/100 | |
| Scalability | X/100 | |

## Critical Issues
Blockers only: bugs, security flaws, race conditions, scalability failures.
Include technical reason + real-world impact for each.

## Improvements
Concise list. Technical reason + real-world impact per item.

## Complexity Analysis
- Time:
- Space:
- Bottleneck:

## Production-Grade Solution
Single best implementation. Modular, secure, fully documented.
No alternatives — only the correct answer.
`.trim();

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/review
 * @param {Object} req.body.code  - Source code string
 * @param {Object} req.body.mode  - "beginner" | "senior"
 */
const handleReview = async (req, res, next) => {
  try {
    const { code, mode } = req.body;

    const prompt = mode === 'beginner'
      ? buildBeginnerPrompt(code)
      : buildSeniorPrompt(code);

    const reviewText = await geminiService.generateReview(prompt);

    return res.status(200).json({
      success: true,
      mode,
      review: reviewText,
    });

  } catch (error) {
    next(error); // Forward to global error handler
  }
};

module.exports = { handleReview };
