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
      {/* Modern Header Card */}
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm overflow-hidden">
        {/* Black header bar */}
        <div className="bg-[#0A0A0A] px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-header-bold text-lg text-white">
                Weekly Withdrawals
              </h2>
              {advisor && (
                <p className="font-body text-sm text-white/70 mt-1">
                  {advisor.name} • {advisor.scope}
                </p>
              )}
            </div>
            <button
              onClick={handleRunWeeklyJob}
              disabled={isRunningJob}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-body-semi text-sm text-[#0A0A0A] shadow-sm transition-all duration-200 hover:bg-[var(--hover-green)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Run weekly job to generate digests"
            >
              {isRunningJob && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{isRunningJob ? 'Running...' : 'Run Weekly Job'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Job Status Message */}
      {jobMessage && (
        <div
          className={`rounded-xl px-4 py-3.5 text-sm font-body shadow-sm ${
            jobMessage.startsWith('✓')
              ? 'border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,white)] text-[var(--foreground)]'
              : 'border border-[var(--destructive)] bg-[var(--destructive)] text-white'
          }`}
        >
          {jobMessage}
        </div>
      )}

      {/* Filters Card - Modern design */}
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm overflow-hidden">
        {/* Filter header */}
        <div className="border-b border-[var(--border)] bg-[var(--muted)] px-6 py-3">
          <h2 className="font-body-semi text-sm uppercase tracking-wider text-[var(--muted-foreground)]">
            Filters
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick date buttons */}
          <div>
            <label className="font-body-semi text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-3 block">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const range = getLast7Days();
                  setStartISO(range.startISO);
                  setEndISO(range.endISO);
                }}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const range = getCurrentWeek();
                  setStartISO(range.startISO);
                  setEndISO(range.endISO);
                }}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                This Week
              </button>
              <button
                onClick={() => {
                  const range = getLastWeek();
                  setStartISO(range.startISO);
                  setEndISO(range.endISO);
                }}
                className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                Last Week
              </button>
            </div>
          </div>

          {/* Date range and min days filter */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="font-body-semi text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-3 block">
                Date Range
              </label>
              <DateRangePicker
                startISO={startISO}
                endISO={endISO}
                onStartChange={setStartISO}
                onEndChange={setEndISO}
              />
            </div>
            <div>
              <label className="font-body-semi text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-3 block">
                Min Days After Deadline
              </label>
              <input
                type="number"
                min="0"
                value={minDaysAfter}
                onChange={(e) => setMinDaysAfter(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 font-body text-sm text-[var(--foreground)] transition-all duration-200 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
          <div className="mx-auto flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[color-mix(in_srgb,var(--primary)_30%,transparent)] border-t-[var(--primary)]" />
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              Loading withdrawal data...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-2xl border-2 border-[var(--destructive)] bg-white p-8 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--destructive)]/10">
              <svg className="h-6 w-6 text-[var(--destructive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-header-bold text-lg text-[var(--foreground)]">
              Error Loading Data
            </h3>
            <p className="font-body text-sm text-[var(--destructive)]">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Summary & Data */}
      {!isLoading && !error && data && (
        <>
          {/* Summary Card */}
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-6 shadow-sm">
            <h2 className="font-body-semi text-sm uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
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

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
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
