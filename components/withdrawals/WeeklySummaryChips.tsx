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
      {/* Total chip */}
      <div className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi text-sm shadow-sm">
        Total: {summary.total}
      </div>

      {/* Top majors */}
      {topMajors.map(([majorId, count]) => (
        <div
          key={majorId}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] font-body text-sm shadow-sm"
        >
          {majorId}: {count}
        </div>
      ))}

      {/* Top departments */}
      {topDepartments.map(([deptId, count]) => (
        <div
          key={deptId}
          className="px-4 py-2 rounded-xl bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body text-sm shadow-sm"
        >
          {deptId}: {count}
        </div>
      ))}
    </div>
  );
}
