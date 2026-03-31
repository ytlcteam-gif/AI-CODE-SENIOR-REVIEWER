/**
 * CodeInput.jsx
 * Large developer-friendly code input area.
 * Shows character count and warns when approaching the backend limit.
 */

const MAX_CHARS = 10_000;

export default function CodeInput({ value, onChange }) {
  const charCount  = value.length;
  const isNearLimit = charCount > MAX_CHARS * 0.85;
  const isAtLimit   = charCount >= MAX_CHARS;

  const countColor = isAtLimit
    ? 'text-red-400'
    : isNearLimit
    ? 'text-yellow-400'
    : 'text-gray-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="code-input"
          className="text-xs font-semibold text-gray-400 uppercase tracking-widest"
        >
          Paste Your Code
        </label>
        <span className={`text-xs font-mono ${countColor}`}>
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>

      <textarea
        id="code-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_CHARS}
        spellCheck={false}
        placeholder={`// Paste your code here...\n\ndef example_function():\n    pass`}
        className="
          w-full h-72 p-4 rounded-lg resize-y
          bg-[#0d1117] text-gray-100
          border-2 border-gray-800 focus:border-brand focus:outline-none
          font-mono text-sm leading-relaxed
          placeholder-gray-700
          transition-colors duration-150
        "
      />
    </div>
  );
}
