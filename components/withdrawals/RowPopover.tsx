/**
 * Assumptions:
 * - Uses design tokens from globals.css
 * - Displays course description + quick actions (placeholders)
 * - Closes on Esc or click outside
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { WithdrawalRow } from '@/types/withdrawals';

interface RowPopoverProps {
  row: WithdrawalRow;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function RowPopover({ row, position, onClose }: RowPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 p-4 rounded-xl bg-[var(--popover)] border border-[var(--border)] shadow-lg"
      style={{ top: position.y, left: position.x }}
      role="dialog"
      aria-label="Course details"
      tabIndex={0}
    >
      <div className="space-y-3">
        <div>
          <h3 className="font-body-semi text-[var(--foreground)] text-base">
            {row.course.code} - {row.course.title}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Section {row.course.section} • {row.course.instructor}
          </p>
        </div>

        <div className="text-sm text-[var(--muted-foreground)]">
          <p className="mb-1">
            <strong>Student:</strong> {row.student.name}
          </p>
          <p className="mb-1">
            <strong>Major:</strong> {row.student.majorId}
          </p>
          <p>
            <strong>Withdrawn:</strong> {row.daysAfterDeadline} days after deadline
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--border)] flex gap-2">
          <button className="px-3 py-1.5 text-xs font-body-semi rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
            Email Student
          </button>
          <button className="px-3 py-1.5 text-xs font-body-semi rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
