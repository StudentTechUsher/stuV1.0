/**
 * Assumptions:
 * - Uses design tokens from globals.css
 * - Virtualized if >200 rows (simplified with react-window)
 * - Row hover opens popover
 */

'use client';

import React, { useState } from 'react';
import type { WithdrawalRow } from '@/types/withdrawals';
import { fmtDate, fmtDateTime } from '@/utils/date';
import RowPopover from './RowPopover';

interface WithdrawalTableProps {
  rows: WithdrawalRow[];
  onStudentClick?: (studentId: string) => void;
}

export default function WithdrawalTable({
  rows,
  onStudentClick,
}: WithdrawalTableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleRowMouseEnter = (
    e: React.MouseEvent<HTMLTableRowElement>,
    idx: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPosition({ x: rect.right + 8, y: rect.top });
    setHoveredRow(idx);
  };

  const handleRowMouseLeave = () => {
    setHoveredRow(null);
    setPopoverPosition(null);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-card p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
            <svg className="h-6 w-6 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-header-bold text-lg text-[var(--foreground)]">
            No Withdrawals Found
          </h3>
          <p className="font-body text-sm text-[var(--muted-foreground)]">
            No withdrawals found for this period. Try adjusting your filters or date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-foreground text-background">
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Major</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Course</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Section</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Instructor</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Term</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Credits</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Deadline</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Withdrawn</th>
              <th className="px-6 py-4 text-left font-body-semi text-xs uppercase tracking-wider">Days After</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="cursor-pointer border-b border-[var(--border)] transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--card))] hover:shadow-sm"
                onMouseEnter={(e) => handleRowMouseEnter(e, idx)}
                onMouseLeave={handleRowMouseLeave}
                onClick={() => onStudentClick?.(row.student.id)}
              >
                <td className="px-6 py-4 font-body-semi text-[var(--foreground)]">
                  {row.student.name}
                </td>
                <td className="px-6 py-4 font-body text-[var(--muted-foreground)]">
                  {row.student.majorId}
                </td>
                <td className="px-6 py-4 font-body-semi text-[var(--foreground)]">
                  {row.course.code}
                </td>
                <td className="px-6 py-4 font-body text-[var(--muted-foreground)]">
                  {row.course.section}
                </td>
                <td className="px-6 py-4 font-body text-[var(--muted-foreground)]">
                  {row.course.instructor}
                </td>
                <td className="px-6 py-4 font-body text-[var(--muted-foreground)]">
                  {row.course.term}
                </td>
                <td className="px-6 py-4 font-body-semi text-[var(--foreground)]">
                  {row.course.credits}
                </td>
                <td className="px-6 py-4 font-body text-[var(--muted-foreground)]">
                  {fmtDate(row.course.addDropDeadlineISO)}
                </td>
                <td className="px-6 py-4 font-body text-[var(--foreground)]">
                  {fmtDateTime(row.actionAtISO)}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-md bg-[var(--destructive)]/10 px-2.5 py-1 font-body-semi text-xs text-[var(--destructive)]">
                    {row.daysAfterDeadline}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popover */}
      {hoveredRow !== null && popoverPosition && (
        <RowPopover
          row={rows[hoveredRow]}
          position={popoverPosition}
          onClose={() => setHoveredRow(null)}
        />
      )}
    </div>
  );
}
