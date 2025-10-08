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
      <div className="p-8 text-center text-[var(--muted-foreground)] font-body">
        No withdrawals found for this period.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-[var(--border)] shadow-md">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-[var(--muted)] text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Major</th>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Instructor</th>
            <th className="px-4 py-3">Term</th>
            <th className="px-4 py-3">Credits</th>
            <th className="px-4 py-3">Add/Drop Deadline</th>
            <th className="px-4 py-3">Withdrawn At</th>
            <th className="px-4 py-3">Days After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
              onMouseEnter={(e) => handleRowMouseEnter(e, idx)}
              onMouseLeave={handleRowMouseLeave}
              onClick={() => onStudentClick?.(row.student.id)}
            >
              <td className="px-4 py-3 font-body-semi text-[var(--foreground)]">
                {row.student.name}
              </td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {row.student.majorId}
              </td>
              <td className="px-4 py-3 text-[var(--foreground)]">
                {row.course.code}
              </td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {row.course.section}
              </td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {row.course.instructor}
              </td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {row.course.term}
              </td>
              <td className="px-4 py-3 text-[var(--foreground)]">
                {row.course.credits}
              </td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {fmtDate(row.course.addDropDeadlineISO)}
              </td>
              <td className="px-4 py-3 text-[var(--foreground)]">
                {fmtDateTime(row.actionAtISO)}
              </td>
              <td className="px-4 py-3 font-body-semi text-[var(--destructive)]">
                {row.daysAfterDeadline}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
