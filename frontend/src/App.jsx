/**
 * App.jsx — Root component.
 * Owns all state: code input, mode selection, review output, loading, error.
 * Passes down only what each child needs.
 */

import { useState } from 'react';
import CodeInput    from './components/CodeInput';
import ModeToggle   from './components/ModeToggle';
import ReviewOutput from './components/ReviewOutput';
import { submitReview } from './services/api';

export default function App() {
  const [code,    setCode]    = useState('');
  const [mode,    setMode]    = useState('beginner');
  const [review,  setReview]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const canSubmit = code.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    setError(null);
    setReview(null);
    setLoading(true);

    try {
      const data = await submitReview(code.trim(), mode);
      setReview(data.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setReview(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <span className="font-semibold text-gray-100 text-sm tracking-tight">
              Code Reviewer
            </span>
            <span className="hidden sm:block text-xs text-gray-600 font-mono">
              v5 · Gemini 1.5 Flash
            </span>
          </div>
          {review && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← New Review
            </button>
          )}
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {!review ? (
          /* ── Input Panel (shown before review) ──────────────────────────── */
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {/* Page title */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-1">
                AI Senior Code Reviewer
              </h1>
              <p className="text-gray-500 text-sm">
                Paste your code. Get a production-grade review in seconds.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            {/* Code input */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <CodeInput value={code} onChange={setCode} />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide
                transition-all duration-150
                ${canSubmit
                  ? 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20 active:scale-[0.98]'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                  Analyzing with Gemini...
                </span>
              ) : (
                'Run Review →'
              )}
            </button>

            {/* Error (shown below submit if review hasn't loaded yet) */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-950 border border-red-800">
                <span className="text-red-400 mt-0.5">✕</span>
                <div>
                  <p className="text-red-300 font-semibold text-sm">Review Failed</p>
                  <p className="text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ── Two-column layout (shown after review loads) ───────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">

            {/* Left: inputs (locked after submit, edit + re-run possible) */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <ModeToggle mode={mode} onChange={setMode} />
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <CodeInput value={code} onChange={setCode} />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  w-full py-3 rounded-xl font-semibold text-sm tracking-wide
                  transition-all duration-150
                  ${canSubmit
                    ? 'bg-brand hover:bg-brand-dark text-white active:scale-[0.98]'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                    Re-analyzing...
                  </span>
                ) : (
                  'Re-run Review →'
                )}
              </button>
            </div>

            {/* Right: review output */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <ReviewOutput
                review={review}
                loading={loading}
                error={error}
                mode={mode}
                code={code}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900 mt-16 py-6 text-center">
        <p className="text-gray-700 text-xs">
          AI Senior Code Reviewer · Powered by Gemini 1.5 Flash · Stateless
        </p>
      </footer>
    </div>
  );
}
