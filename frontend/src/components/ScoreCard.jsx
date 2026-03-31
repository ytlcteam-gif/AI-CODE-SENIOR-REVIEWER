/**
 * ScoreCard.jsx
 *
 * Renders animated score bars for each metric from the Engineering Scorecard.
 * Uses framer-motion for the bar fill animation.
 *
 * Props:
 *   scores — Array<{ label: string, score: number }>
 *
 * Color thresholds mirror the system prompt's score interpretation:
 *   90–100  production-ready  → emerald
 *   70–89   minor issues      → blue
 *   50–69   significant       → yellow
 *   <50     not mergeable     → red
 */

import { motion } from 'framer-motion';

const getBarColor = (score) => {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getTextColor = (score) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const getVerdict = (score) => {
  if (score >= 90) return 'Production-ready';
  if (score >= 70) return 'Minor issues';
  if (score >= 50) return 'Significant issues';
  return 'Not mergeable';
};

function ScoreRow({ label, score, index }) {
  const barColor  = getBarColor(score);
  const textColor = getTextColor(score);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-xs font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs">{getVerdict(score)}</span>
          <span className={`text-sm font-bold font-mono ${textColor}`}>{score}</span>
        </div>
      </div>
      {/* Track */}
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        {/* Animated fill */}
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{
            duration: 0.7,
            ease: 'easeOut',
            delay: index * 0.1,
          }}
        />
      </div>
    </div>
  );
}

export default function ScoreCard({ scores }) {
  if (!scores || scores.length === 0) return null;

  const average = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  const avgColor = getTextColor(average);
  const avgVerdict = getVerdict(average);

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-xl p-5 mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Engineering Scorecard
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs">{avgVerdict}</span>
          <span className={`text-2xl font-bold font-mono ${avgColor}`}>
            {average}
            <span className="text-xs text-gray-600 font-normal">/100</span>
          </span>
        </div>
      </div>

      {/* Score rows */}
      <div className="flex flex-col gap-4">
        {scores.map((item, i) => (
          <ScoreRow
            key={item.label}
            label={item.label}
            score={item.score}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
