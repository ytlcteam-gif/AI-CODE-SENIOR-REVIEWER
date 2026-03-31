/**
 * pdfController.js
 *
 * Responsibility Decision:
 * - Input validation belongs at: API Layer (validatePdfRequest middleware)
 * - Reason: This controller's contract is "given valid inputs, produce a PDF".
 *   Mixing validation here couples transport concerns into a generation function.
 *   The controller trusts that middleware has already enforced the contract.
 *
 * Design Decisions:
 * - Puppeteer browser is launched and destroyed per request (stateless).
 *   Trade-off: Slightly higher per-request latency (~300ms launch overhead)
 *   vs. zero risk of browser state leaking between requests.
 *   Browser pooling is not used — premature optimization for this scale.
 * - PDF is streamed as a binary buffer. Nothing touches disk.
 * - Markdown in review text is converted to HTML via a lightweight regex
 *   transform (no markdown lib dependency on the backend — the PDF renderer
 *   is not a content pipeline).
 */

const puppeteer = require('puppeteer');

// ─── Markdown → HTML (Lightweight, PDF-only) ─────────────────────────────────
// Full markdown parsing is NOT needed here. Gemini outputs predictable
// structured markdown (headers, lists, code blocks, bold). This handles
// those patterns only. If Gemini output changes, update these patterns.

const mdToHtml = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Fenced code blocks (``` ... ```) — must run before inline code
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // H2 headers
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H3 headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> blocks in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>')
    // Table rows: | col | col | → tr/td
    .replace(/^\|(.+)\|$/gm, (_, row) => {
      const cells = row.split('|').map((c) => c.trim());
      // Detect separator row (|---|---|)
      if (cells.every((c) => /^[-: ]+$/.test(c))) return '';
      const tag = cells[0]?.includes('---') ? 'th' : 'td';
      return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    })
    // Wrap orphaned <tr> blocks in <table>
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<table>${match}</table>`)
    // Paragraphs: blank-line-separated text blocks not already in a tag
    .replace(/^(?!<[a-z])(.*\S.*)$/gm, '<p>$1</p>')
    // Clean up blank lines
    .replace(/\n{3,}/g, '\n\n');
};

// ─── HTML Template ────────────────────────────────────────────────────────────

const buildHtml = (code, reviewHtml, mode) => {
  const timestamp  = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const modeColor  = mode === 'senior' ? '#ef4444' : '#10b981';
  const modeLabel  = mode.toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    /* ── Reset & Base ─────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0f;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.65;
      padding: 0;
    }

    /* ── Page Layout ──────────────────────────────────────────── */
    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 48px 52px;
    }

    /* ── Header ───────────────────────────────────────────────── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #1e1e2e;
      padding-bottom: 24px;
      margin-bottom: 36px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }
    .header-sub {
      color: #64748b;
      font-size: 11px;
      margin-top: 4px;
    }
    .mode-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1.5px solid ${modeColor};
      color: ${modeColor};
      text-transform: uppercase;
      white-space: nowrap;
      margin-top: 4px;
    }

    /* ── Section ──────────────────────────────────────────────── */
    .section {
      margin-bottom: 40px;
    }
    .section-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 12px;
    }

    /* ── Code Block ───────────────────────────────────────────── */
    .code-block {
      background: #0d1117;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 20px;
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 11.5px;
      color: #a5f3fc;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.7;
      max-height: 400px;
      overflow: hidden;
    }

    /* ── Review Markdown Output ───────────────────────────────── */
    .review-body h2 {
      font-size: 14px;
      font-weight: 700;
      color: #818cf8;
      margin: 28px 0 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #1e293b;
    }
    .review-body h2:first-child { margin-top: 0; }
    .review-body h3 {
      font-size: 12px;
      font-weight: 600;
      color: #e2e8f0;
      margin: 16px 0 6px;
    }
    .review-body p {
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .review-body ul {
      padding-left: 20px;
      margin-bottom: 10px;
    }
    .review-body li {
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .review-body strong { color: #e2e8f0; }
    .review-body code {
      background: #1e293b;
      color: #34d399;
      padding: 1px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
    }
    .review-body pre {
      background: #0d1117;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 10px 0;
      overflow: hidden;
    }
    .review-body pre code {
      background: none;
      color: #a5f3fc;
      font-size: 11px;
      padding: 0;
    }
    .review-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12px;
    }
    .review-body th {
      background: #1e293b;
      color: #94a3b8;
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .review-body td {
      padding: 8px 12px;
      border-bottom: 1px solid #1e293b;
      color: #94a3b8;
    }
    .review-body tr:last-child td { border-bottom: none; }

    /* ── Divider ──────────────────────────────────────────────── */
    .divider {
      border: none;
      border-top: 1px solid #1e293b;
      margin: 36px 0;
    }

    /* ── Footer ───────────────────────────────────────────────── */
    .footer {
      border-top: 1px solid #1e293b;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left { color: #334155; font-size: 10px; }
    .footer-right { color: #334155; font-size: 10px; text-align: right; }
    .footer-brand { color: #4f46e5; font-weight: 600; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-title">AI Senior Code Review Audit</div>
      <div class="header-sub">Engineering Mentor v6.3 · Gemini 1.5 Flash</div>
    </div>
    <div class="mode-badge">${modeLabel} Mode</div>
  </div>

  <!-- Section 1: Code -->
  <div class="section">
    <div class="section-label">Section 1 — Submitted Code</div>
    <div class="code-block">${escapeHtml(code)}</div>
  </div>

  <hr class="divider" />

  <!-- Section 2: Review -->
  <div class="section">
    <div class="section-label">Section 2 — AI Review</div>
    <div class="review-body">${reviewHtml}</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">Generated: ${timestamp}</div>
    <div class="footer-right">
      <span class="footer-brand">AI Code Reviewer</span><br />
      Powered by Gemini 1.5 Flash · Stateless
    </div>
  </div>

</div>
</body>
</html>`;
};

// ─── HTML Escape (Security: code may contain < > & characters) ───────────────
const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/generate-pdf
 *
 * @param {string} req.body.code    - Original source code
 * @param {string} req.body.review  - AI review text (markdown)
 * @param {string} req.body.mode    - "beginner" | "senior"
 */
const handleGeneratePdf = async (req, res, next) => {
  let browser = null;

  try {
    const { code, review, mode } = req.body;

    // Convert markdown review to HTML for PDF rendering
    const reviewHtml = mdToHtml(review);
    const html       = buildHtml(code, reviewHtml, mode);

    // Launch Puppeteer — one browser per request, destroyed in finally
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Prevents /dev/shm OOM in containers
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for full render before printing
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format:          'A4',
      printBackground: true, // Required for dark theme backgrounds
      margin: {
        top:    '16mm',
        right:  '0mm',
        bottom: '16mm',
        left:   '0mm',
      },
    });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="code-review-audit.pdf"',
      'Content-Length':      pdfBuffer.length,
    });

    return res.status(200).end(pdfBuffer);

  } catch (error) {
    next(error);
  } finally {
    // Always close — prevents orphaned Chrome processes and memory leaks
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { handleGeneratePdf };
