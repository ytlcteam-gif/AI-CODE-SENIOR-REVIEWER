/**
 * parseReview.js
 *
 * Splits raw Gemini markdown into named section buckets for tab rendering.
 * Designed around the exact prompt templates in reviewController.js.
 *
 * Returns:
 *   {
 *     summary:      string  — Executive Summary + The Good + Complexity Analysis
 *     scorecard:    Array<{ label, score }>  — extracted from table
 *     issues:       string  — Critical Issues + Junior Pitfalls Found
 *     improvements: string  — Mentorship & Improvements / Improvements
 *     code:         string  — Solutions / Production-Grade Solution
 *   }
 *
 * Design decision: if a section is missing (Gemini occasionally omits one),
 * the bucket gets an empty string. Tabs handle empty gracefully.
 */

/**
 * Splits raw markdown into a map of { heading → body } pairs.
 * Splits on `## ` headings only (H2). H3 headings stay inside bodies.
 *
 * @param {string} raw
 * @returns {Map<string, string>}  key = lowercase heading text, value = section body
 */
const splitSections = (raw) => {
  const map = new Map();
  // Split on lines that start with "## "
  const parts = raw.split(/\n(?=## )/);

  for (const part of parts) {
    const firstNewline = part.indexOf('\n');
    if (firstNewline === -1) continue;

    const heading = part.slice(0, firstNewline).replace(/^## /, '').trim().toLowerCase();
    const body    = part.slice(firstNewline + 1).trim();
    map.set(heading, body);
  }

  return map;
};

/**
 * Extracts score rows from the Engineering Scorecard markdown table.
 *
 * Table format from prompt:
 *   | Metric | Score (0-100) | Note |
 *   | Logic & Correctness | 45/100 | note |
 *
 * @param {string} tableMarkdown
 * @returns {Array<{ label: string, score: number }>}
 */
const extractScores = (tableMarkdown) => {
  const scores = [];
  const rows   = tableMarkdown.split('\n');

  for (const row of rows) {
    // Skip separator rows (|---|---|) and header rows
    if (!row.trim().startsWith('|')) continue;
    if (/^\|[-| :]+\|$/.test(row.trim())) continue;

    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const label     = cells[0];
    const scoreCell = cells[1]; // "45/100" or "X/100"

    const match = scoreCell.match(/(\d+)\s*\/\s*100/);
    if (!match) continue;

    const score = parseInt(match[1], 10);
    if (isNaN(score)) continue;

    // Skip header row where label is "Metric"
    if (label.toLowerCase() === 'metric') continue;

    scores.push({ label, score });
  }

  return scores;
};

/**
 * Joins multiple section bodies under their original headings.
 * Used to merge related sections into one tab panel.
 *
 * @param {Map<string, string>} map
 * @param {string[]} keys - lowercase heading keys to join
 * @returns {string}
 */
const joinSections = (map, keys) => {
  return keys
    .filter((key) => {
      // Partial match — handles "solution 1", "mentorship & improvements", etc.
      return [...map.keys()].some((k) => k.includes(key));
    })
    .map((key) => {
      const matchedKey = [...map.keys()].find((k) => k.includes(key));
      const body       = map.get(matchedKey) || '';
      // Re-attach heading so markdown renders correctly
      const heading    = matchedKey
        ? matchedKey.replace(/\b\w/g, (c) => c.toUpperCase())
        : key;
      return `## ${heading}\n\n${body}`;
    })
    .join('\n\n');
};

/**
 * Main parser. Takes raw review markdown, returns structured tab data.
 *
 * @param {string} raw  - Full review text from Gemini
 * @returns {{
 *   summary: string,
 *   scorecard: Array<{ label: string, score: number }>,
 *   issues: string,
 *   improvements: string,
 *   code: string,
 * }}
 */
export const parseReview = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return { summary: '', scorecard: [], issues: '', improvements: '', code: '' };
  }

  const map = splitSections(raw);

  // ── Scorecard: extract before joining (needs raw table text) ───────────────
  const scorecardKey  = [...map.keys()].find((k) => k.includes('scorecard'));
  const scorecardRaw  = scorecardKey ? map.get(scorecardKey) : '';
  const scorecard     = extractScores(scorecardRaw);

  // ── Summary tab: exec summary + the good + complexity ─────────────────────
  const summary = joinSections(map, ['executive summary', 'the good', 'complexity analysis']);

  // ── Issues tab: critical issues + junior pitfalls ─────────────────────────
  const issues = joinSections(map, ['critical issues', 'junior pitfalls']);

  // ── Improvements tab ───────────────────────────────────────────────────────
  const improvements = joinSections(map, ['mentorship', 'improvements']);

  // ── Code tab: solutions (beginner) or production-grade solution (senior) ──
  const code = joinSections(map, ['solution', 'production-grade']);

  return { summary, scorecard, issues, improvements, code };
};
