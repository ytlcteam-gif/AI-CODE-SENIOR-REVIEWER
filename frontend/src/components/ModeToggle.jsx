/**
 * ModeToggle.jsx
 * Beginner / Senior mode selector.
 * Visually distinct: green = beginner (mentor), red = senior (strict).
 */

const MODES = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Teaching-focused. Two solutions provided.',
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    inactiveClass: 'text-gray-400 border-gray-700 hover:border-emerald-600 hover:text-emerald-400',
    dot: 'bg-emerald-400',
  },
  {
    id: 'senior',
    label: 'Senior',
    description: 'Production-grade. No hand-holding.',
    activeClass: 'bg-red-600 text-white border-red-600',
    inactiveClass: 'text-gray-400 border-gray-700 hover:border-red-500 hover:text-red-400',
    dot: 'bg-red-400',
  },
];

export default function ModeToggle({ mode, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Review Mode
      </label>
      <div className="flex gap-3">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`
                flex-1 flex flex-col items-start gap-1 px-4 py-3 rounded-lg border-2
                transition-all duration-150 text-left
                ${isActive ? m.activeClass : m.inactiveClass}
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                <span className="font-semibold text-sm">{m.label}</span>
              </div>
              <span className="text-xs opacity-70 leading-tight">{m.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
