/**
 * Assumptions:
 * - Main panel component for Weekly Withdrawals tab
 * - Uses design tokens from globals.css
 * - Handles filters, job runner, summary, table, and actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { seedAll, getAdvisors } from '@/lib/mocks/withdrawalSeed';
import { useWeeklyWithdrawals } from '@/lib/hooks/useWeeklyWithdrawals';
import { getCurrentWeek, getLastWeek, getLast7Days } from '@/utils/date';
import type { WithdrawalRow } from '@/types/withdrawals';
import type { AdvisorDigest } from '@/lib/jobs/withdrawalDigest';
import DateRangePicker from '@/components/common/DateRangePicker';
import ExportCsvButton from '@/components/common/ExportCsvButton';
import WeeklySummaryChips from './WeeklySummaryChips';
import WithdrawalTable from './WithdrawalTable';
import StudentDrawer from './StudentDrawer';
import EmailPreviewButton from './EmailPreviewButton';

interface ReportsWithdrawalsPanelProps {
  advisorId: string;
  defaultRange: { startISO: string; endISO: string };
}

export default function ReportsWithdrawalsPanel({
  advisorId,
  defaultRange,
}: ReportsWithdrawalsPanelProps) {
  const [startISO, setStartISO] = useState(defaultRange.startISO);
  const [endISO, setEndISO] = useState(defaultRange.endISO);
  const [minDaysAfter, setMinDaysAfter] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedStudentRows, setSelectedStudentRows] = useState<WithdrawalRow[]>([]);
  const [isRunningJob, setIsRunningJob] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useWeeklyWithdrawals(
    advisorId,
    startISO,
    endISO
  );

  // Seed data on mount
  useEffect(() => {
    seedAll();
  }, []);

  // Filter rows by minDaysAfter
  const filteredRows = data?.rows.filter(
    (row) => row.daysAfterDeadline >= minDaysAfter
  ) || [];

  // Build digest for email preview
  const advisor = getAdvisors().find((a) => a.id === advisorId);
  const digest: AdvisorDigest | null = advisor && data
    ? {
        advisor,
        window: { startISO, endISO },
        totals: {
          count: filteredRows.length,
          majors: filteredRows.reduce((acc, row) => {
            acc[row.student.majorId] = (acc[row.student.majorId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          departments: filteredRows.reduce((acc, row) => {
            acc[row.student.departmentId] =
              (acc[row.student.departmentId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          colleges: filteredRows.reduce((acc, row) => {
            acc[row.student.collegeId] = (acc[row.student.collegeId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        rows: filteredRows,
      }
    : null;

  const handleRunWeeklyJob = async () => {
    setIsRunningJob(true);
    setJobMessage(null);

    try {
      const response = await fetch('/api/withdrawals/run-weekly-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startISO, endISO }),
      });

      const result = await response.json();

      if (response.ok) {
        setJobMessage(`✓ ${result.message}`);
        refetch();
      } else {
        setJobMessage(`✗ Error: ${result.error}`);
      }
    } catch (err) {
      setJobMessage(`✗ Failed to run job: ${String(err)}`);
    } finally {
      setIsRunningJob(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-header text-[var(--foreground)]">
            Weekly Withdrawals
          </h1>
          {advisor && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {advisor.name} ({advisor.email}) • Scope: {advisor.scope}
            </p>
          )}
        </div>
        <button
          onClick={handleRunWeeklyJob}
          disabled={isRunningJob}
          className="px-4 py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-body-semi text-sm hover:bg-[var(--muted)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
          aria-label="Run weekly job to generate digests"
        >
          {isRunningJob ? 'Running...' : 'Run Weekly Job'}
        </button>
      </div>

      {jobMessage && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-body ${
            jobMessage.startsWith('✓')
              ? 'bg-[var(--primary-15)] text-[var(--foreground)]'
              : 'bg-[var(--destructive)] text-[var(--destructive-foreground)]'
          }`}
        >
          {jobMessage}
        </div>
      )}

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm space-y-4">
        <h2 className="text-lg font-body-semi text-[var(--foreground)]">Filters</h2>

        {/* Quick date buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const range = getLast7Days();
              setStartISO(range.startISO);
              setEndISO(range.endISO);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body-semi hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const range = getCurrentWeek();
              setStartISO(range.startISO);
              setEndISO(range.endISO);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body-semi hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => {
              const range = getLastWeek();
              setStartISO(range.startISO);
              setEndISO(range.endISO);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] font-body-semi hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
          >
            Last Week
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <DateRangePicker
            startISO={startISO}
            endISO={endISO}
            onStartChange={setStartISO}
            onEndChange={setEndISO}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span className="font-body-semi">Min days after deadline:</span>
            <input
              type="number"
              min="0"
              value={minDaysAfter}
              onChange={(e) => setMinDaysAfter(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </label>
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="p-8 text-center text-[var(--muted-foreground)] font-body">
          Loading withdrawals...
        </div>
      )}

      {error && (
        <div className="p-8 text-center text-[var(--destructive)] font-body">
          Error loading data: {error}
        </div>
      )}

      {/* Summary */}
      {!isLoading && !error && data && (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-body-semi text-[var(--foreground)]">
              Summary
            </h2>
            <WeeklySummaryChips
              summary={{
                total: filteredRows.length,
                byMajor: filteredRows.reduce((acc, row) => {
                  acc[row.student.majorId] = (acc[row.student.majorId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
                byDepartment: filteredRows.reduce((acc, row) => {
                  acc[row.student.departmentId] =
                    (acc[row.student.departmentId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {digest && <EmailPreviewButton digest={digest} />}
            <ExportCsvButton
              rows={filteredRows}
              filename={`weekly-withdrawals-${startISO.split('T')[0]}-to-${
                endISO.split('T')[0]
              }.csv`}
            />
          </div>

          {/* Table */}
          <WithdrawalTable
            rows={filteredRows}
            onStudentClick={(studentId) => {
              const studentWithdrawals = filteredRows.filter(
                (row) => row.student.id === studentId
              );
              setSelectedStudent(studentId);
              setSelectedStudentRows(studentWithdrawals);
            }}
          />
        </>
      )}

      {/* Student Drawer */}
      {selectedStudent && (
        <StudentDrawer
          studentId={selectedStudent}
          withdrawalRows={selectedStudentRows}
          onClose={() => {
            setSelectedStudent(null);
            setSelectedStudentRows([]);
          }}
        />
      )}
    </div>
  );
}
