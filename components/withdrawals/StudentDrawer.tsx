/**
 * Assumptions:
 * - Right-side drawer with student profile snippet
 * - Uses design tokens from globals.css
 * - Shows withdrawal details for the student
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { WithdrawalRow } from '@/types/withdrawals';
import { fmtDate, fmtDateTime } from '@/utils/date';

interface StudentDrawerProps {
  studentId: string;
  withdrawalRows: WithdrawalRow[];
  onClose: () => void;
}

export default function StudentDrawer({
  studentId,
  withdrawalRows,
  onClose,
}: StudentDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const student = withdrawalRows[0]?.student;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-96 bg-[var(--card)] border-l border-[var(--border)] shadow-2xl z-50 p-6 overflow-y-auto"
        role="dialog"
        aria-labelledby="drawer-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            id="drawer-title"
            className="text-xl font-body-semi text-[var(--foreground)]"
          >
            Student Profile
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded p-1"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              Student ID
            </p>
            <p className="text-base font-body-semi text-[var(--foreground)]">
              {studentId}
            </p>
          </div>

          {student && (
            <>
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Name</p>
                <p className="text-base font-body-semi text-[var(--foreground)]">
                  {student.name}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Email</p>
                <p className="text-base text-[var(--foreground)]">
                  {student.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Major</p>
                <p className="text-base text-[var(--foreground)]">
                  {student.majorId}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">
                  Department
                </p>
                <p className="text-base text-[var(--foreground)]">
                  {student.departmentId}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">College</p>
                <p className="text-base text-[var(--foreground)]">
                  {student.collegeId}
                </p>
              </div>
            </>
          )}

          {/* Withdrawals section */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-base font-body-semi text-[var(--foreground)] mb-3">
              Withdrawals ({withdrawalRows.length})
            </h3>
            <div className="space-y-3">
              {withdrawalRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[var(--muted)] border border-[var(--border)]"
                >
                  <p className="font-body-semi text-[var(--foreground)] mb-1">
                    {row.course.code} - {row.course.title}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    Section {row.course.section} • {row.course.credits} credits
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    Instructor: {row.course.instructor}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    Term: {row.course.term}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    Add/Drop Deadline: {fmtDate(row.course.addDropDeadlineISO)}
                  </p>
                  <p className="text-sm font-body-semi text-[var(--destructive)]">
                    Withdrawn: {fmtDateTime(row.actionAtISO)} ({row.daysAfterDeadline}{' '}
                    days after deadline)
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-base font-body-semi text-[var(--foreground)] mb-2">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2">
              <button className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi text-sm hover:bg-[var(--hover-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors">
                View Full Plan
              </button>
              <button className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors">
                Send Email
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-base font-body-semi text-[var(--foreground)] mb-2">
              Advisor Notes
            </h3>
            <textarea
              className="w-full h-32 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Add a note about this student..."
            />
            <button className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors">
              Save Note
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
