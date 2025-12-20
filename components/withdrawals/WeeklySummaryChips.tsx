/**
 * Assumptions:
 * - Uses design tokens from globals.css
 * - Displays total, top 3 majors, top 3 departments
 */

'use client';

import React from 'react';

interface Summary {
  total: number;
  byMajor: Record<string, number>;
  byDepartment: Record<string, number>;
}

interface WeeklySummaryChipsProps {
  summary: Summary;
}

export default function WeeklySummaryChips({ summary }: WeeklySummaryChipsProps) {
  const topMajors = Object.entries(summary.byMajor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topDepartments = Object.entries(summary.byDepartment)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Total chip - Primary green with dark text */}
      <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 shadow-sm">
        <svg className="h-4 w-4 text-[var(--primary-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="font-body-semi text-sm text-[var(--primary-foreground)]">
          Total: <span className="font-bold">{summary.total}</span>
        </span>
      </div>

      {/* Top majors - Subtle background */}
      {topMajors.map(([majorId, count]) => (
        <div
          key={majorId}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-card px-4 py-2.5 shadow-sm"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,var(--card))]">
            <span className="font-body-semi text-xs text-[var(--foreground)]">{count}</span>
          </div>
          <span className="font-body text-sm text-[var(--muted-foreground)]">{majorId}</span>
        </div>
      ))}

      {/* Top departments - Slightly different style */}
      {topDepartments.map(([deptId, count]) => (
        <div
          key={deptId}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 shadow-sm"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-card">
            <span className="font-body-semi text-xs text-[var(--foreground)]">{count}</span>
          </div>
          <span className="font-body text-sm text-[var(--foreground)]">{deptId}</span>
        </div>
      ))}
    </div>
  );
}
