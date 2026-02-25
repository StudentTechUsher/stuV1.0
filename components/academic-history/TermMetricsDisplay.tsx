'use client';

/**
 * TermMetricsDisplay Component
 * Displays per-semester metrics: hours earned, hours graded, term GPA
 * Used in semester card headers
 */

interface TermMetricsDisplayProps {
  hoursEarned: number | null;
  hoursGraded: number | null;
  termGpa: number | null;
}

export function TermMetricsDisplay({
  hoursEarned,
  hoursGraded,
  termGpa,
}: TermMetricsDisplayProps) {
  return (
    <div className="flex items-center gap-4 mt-1">
      <span className="font-body text-xs text-zinc-300 dark:text-zinc-700">
        <span className="font-semibold">{hoursEarned ?? '—'}</span> hrs earned
      </span>
      <span className="text-zinc-500">•</span>
      <span className="font-body text-xs text-zinc-300 dark:text-zinc-700">
        <span className="font-semibold">{hoursGraded ?? '—'}</span> hrs graded
      </span>
      <span className="text-zinc-500">•</span>
      <span className="font-body text-xs text-zinc-300 dark:text-zinc-700">
        <span className="font-semibold">{termGpa != null ? termGpa.toFixed(2) : '—'}</span> GPA
      </span>
    </div>
  );
}
