/**
 * ReviewOutput.jsx
 *
 * Dashboard-style review renderer with tabs, animated scorecards,
 * and syntax-highlighted code blocks.
 *
 * Tabs:
 *   Summary     — Executive summary + animated scorecard + complexity
 *   Issues      — Critical issues + junior pitfalls
 *   Improvements — Mentorship section / senior improvements
 *   Code        — Solutions with syntax highlighting
 *
 * All existing functionality preserved:
 *   - PDF download
 *   - Markdown download
 *   - Loading / error / empty states
 */

import { useState }      from 'react';
import ReactMarkdown     from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus }   from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

import ScoreCard         from './ScoreCard';
import { parseReview }   from '../utils/parseReview';
import { downloadPdf }   from '../services/api';

// ─── Static Data ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary',      label: 'Summary'      },
  { id: 'issues',       label: 'Issues'       },
  { id: 'improvements', label: 'Improvements' },
  { id: 'code',         label: 'Code'         },
];

// ─── Markdown Renderers ───────────────────────────────────────────────────────
// Block code: className will be "language-xxx" (set by fenced code blocks).
// Inline code: no className → render as <code> span.

const markdownComponents = {
  h2: ({ children }) => (
    <h2 className="text-indigo-400 font-bold text-sm mt-7 mb-3 pb-2 border-b border-gray-800 first:mt-0 uppercase tracking-wide">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-gray-200 font-semibold text-sm mt-5 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-300 text-sm leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-4 text-sm pl-1">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 text-gray-300 leading-relaxed">
      <span className="text-indigo-500 mt-1 shrink-0">›</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="text-gray-100 font-semibold">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-indigo-700 pl-4 my-3 text-gray-400 italic text-sm bg-indigo-950/20 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-gray-800 my-5" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-gray-800">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-gray-800 last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5 bg-gray-900">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="text-gray-300 text-sm px-4 py-2.5">{children}</td>
  ),
  // Block code: has className like "language-python"
  // Inline code: no className
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className || '');
    if (match) {
      return (
        <SyntaxHighlighter
          language={match[1]}
          style={vscDarkPlus}
          customStyle={{
            margin:       '12px 0',
            borderRadius: '8px',
            fontSize:     '12px',
            border:       '1px solid #1e293b',
            background:   '#0d1117',
          }}
          showLineNumbers
          lineNumberStyle={{ color: '#374151', minWidth: '2.5em' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }
    // Inline code
    return (
      <code className="bg-gray-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  // pre: pass-through so SyntaxHighlighter controls its own wrapper
  pre: ({ children }) => <>{children}</>,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-gray-800 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Analyzing with Gemini 1.5 Flash...</p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/50 border border-red-900">
      <span className="text-red-500 font-bold text-sm mt-0.5">✕</span>
      <div>
        <p className="text-red-300 font-semibold text-sm">Review Failed</p>
        <p className="text-red-400 text-sm mt-1 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl">
        {'</>'}
      </div>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        Paste your code, select a mode, and click{' '}
        <strong className="text-gray-400">Run Review</strong> to get your audit.
      </p>
    </div>
  );
}

function EmptyTab({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <p className="text-gray-600 text-sm">No {label.toLowerCase()} data in this review.</p>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, counts }) {
  return (
    <div className="flex gap-1 border-b border-gray-800 mb-6">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-4 py-2.5 text-xs font-semibold transition-colors duration-150
              ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className={`
                ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}
              `}>
                {counts[tab.id]}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Download Buttons ─────────────────────────────────────────────────────────

function DownloadBar({ review, code, mode, onDownloadMd }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError,   setPdfError]   = useState(null);

  const handleDownloadPdf = async () => {
    setPdfError(null);
    setPdfLoading(true);
    try {
      await downloadPdf(code, review, mode);
    } catch (err) {
      setPdfError(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onDownloadMd}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors"
        >
          ↓ Markdown
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className={`
            text-xs px-3 py-1.5 rounded-lg border transition-colors
            ${pdfLoading
              ? 'border-gray-700 text-gray-600 cursor-not-allowed'
              : 'border-indigo-800 text-indigo-400 hover:border-indigo-600 hover:text-indigo-300'
            }
          `}
        >
          {pdfLoading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            '↓ PDF Audit'
          )}
        </button>
      </div>
      {pdfError && (
        <p className="text-red-400 text-xs">{pdfError}</p>
      )}
    </div>
  );
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

const panelVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

function TabPanel({ id, activeTab, children }) {
  if (id !== activeTab) return null;
  return (
    <motion.div
      key={id}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ─── Count helpers ────────────────────────────────────────────────────────────

// Rough count of H2 sections in a markdown string — used for tab badges.
const countSections = (md) => {
  if (!md) return 0;
  return (md.match(/^## /gm) || []).length;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewOutput({ review, loading, error, mode, code }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (loading) return <Spinner />;
  if (error)   return <ErrorBanner message={error} />;
  if (!review) return <EmptyState />;

  const parsed = parseReview(review);

  const counts = {
    summary:      0, // Summary always present — no badge needed
    issues:       countSections(parsed.issues),
    improvements: countSections(parsed.improvements),
    code:         countSections(parsed.code),
  };

  const modeBadge = mode === 'beginner'
    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
    : 'bg-red-950 text-red-400 border border-red-900';

  const handleDownloadMd = () => {
    const blob = new Blob([review], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'code-review.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── Panel Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-bold text-sm">Review Audit</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${modeBadge}`}>
              {mode}
            </span>
            <span className="text-gray-600 text-xs">Gemini 1.5 Flash</span>
          </div>
        </div>
        <DownloadBar
          review={review}
          code={code}
          mode={mode}
          onDownloadMd={handleDownloadMd}
        />
      </div>

      {/* ── Tab Navigation ───────────────────────────────────────────────── */}
      <TabBar active={activeTab} onChange={setActiveTab} counts={counts} />

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* Summary Tab */}
        <TabPanel id="summary" activeTab={activeTab}>
          <ScoreCard scores={parsed.scorecard} />
          {parsed.summary
            ? <ReactMarkdown components={markdownComponents}>{parsed.summary}</ReactMarkdown>
            : <EmptyTab label="Summary" />
          }
        </TabPanel>

        {/* Issues Tab */}
        <TabPanel id="issues" activeTab={activeTab}>
          {parsed.issues
            ? <ReactMarkdown components={markdownComponents}>{parsed.issues}</ReactMarkdown>
            : <EmptyTab label="Issues" />
          }
        </TabPanel>

        {/* Improvements Tab */}
        <TabPanel id="improvements" activeTab={activeTab}>
          {parsed.improvements
            ? <ReactMarkdown components={markdownComponents}>{parsed.improvements}</ReactMarkdown>
            : <EmptyTab label="Improvements" />
          }
        </TabPanel>

        {/* Code Tab */}
        <TabPanel id="code" activeTab={activeTab}>
          {parsed.code
            ? <ReactMarkdown components={markdownComponents}>{parsed.code}</ReactMarkdown>
            : <EmptyTab label="Code solutions" />
          }
        </TabPanel>

      </AnimatePresence>
    </div>
  );
}
