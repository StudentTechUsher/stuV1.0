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
import WithdrawalDigestEmail from '@/emails/WithdrawalDigestEmail';
import { exportWithdrawalsToCSV, downloadCSV } from '@/utils/csv';

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
  const [showReportPreview, setShowReportPreview] = useState(false);

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

  const handleGenerateReport = () => {
    // Set date range to last 7 days
    const range = getLast7Days();
    setStartISO(range.startISO);
    setEndISO(range.endISO);
    setMinDaysAfter(0);

    // Show the report preview modal
    setShowReportPreview(true);
  };

  return (
    <div className="space-y-6">
      {/* Premium Black Header Section - matches grad-plan style */}
      <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)]">
        <div className="bg-[#0A0A0A] rounded-t-[7px] border-b-2 border-[#0A0A0A] px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Weekly Withdrawals
              </h2>
              {advisor && (
                <p className="mt-2 text-sm text-white/80">
                  {advisor.name} ({advisor.email}) •
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                    {advisor.scope}
                  </span>
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
      </section>

      {/* Premium Loading State */}
      {isLoading && (
        <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)]">
          <div className="flex min-h-[300px] items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <svg className="h-12 w-12 animate-spin text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="font-body text-sm text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                Loading withdrawals...
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Premium Error State */}
      {error && (
        <section className="rounded-[7px] border-2 border-[color-mix(in_srgb,var(--destructive)_25%,transparent)] bg-white shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)]">
          <div className="flex min-h-[300px] items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)]">
                <svg className="h-8 w-8 text-[var(--destructive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-body-semi mb-2 text-lg font-semibold text-[var(--destructive)]">
                Error Loading Data
              </h3>
              <p className="font-body text-sm text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Premium Summary & Actions Section */}
      {!isLoading && !error && data && (
        <>
          <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)]">
            <div className="px-6 py-5">
              {/* Header with count badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[color-mix(in_srgb,var(--muted-foreground)_60%,black_40%)]">
                    Summary
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_10px_30px_-20px_rgba(10,31,26,0.65)]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {filteredRows.length} {filteredRows.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {digest && <EmailPreviewButton digest={digest} />}
                  <ExportCsvButton
                    rows={filteredRows}
                    filename={`weekly-withdrawals-${startISO.split('T')[0]}-to-${
                      endISO.split('T')[0]
                    }.csv`}
                  />
                </div>
              </div>

              {/* Summary chips */}
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
          </section>

          {/* Premium Table Section */}
          <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] overflow-hidden">
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
          </section>
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

      {/* Weekly Report Preview Modal */}
      {showReportPreview && digest && (
        <>
          {/* Premium Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setShowReportPreview(false)}
            aria-hidden="true"
          />

          {/* Premium Report Modal */}
          <div
            className="fixed left-1/2 top-1/2 z-50 h-[90vh] w-[90vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white shadow-[0_52px_140px_-50px_rgba(10,31,26,0.75)]"
            role="dialog"
            aria-labelledby="report-preview-title"
          >
            {/* Premium Black Header with Actions */}
            <div className="sticky top-0 z-10 bg-[#0A0A0A] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    id="report-preview-title"
                    className="font-body-semi text-xl font-semibold tracking-tight text-white"
                  >
                    Weekly Withdrawal Report
                  </h2>
                  <p className="mt-1 text-sm text-white/70">
                    Last 7 Days • {filteredRows.length} {filteredRows.length === 1 ? 'withdrawal' : 'withdrawals'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Download Report Button */}
                  <button
                    onClick={() => {
                      const csvContent = exportWithdrawalsToCSV(filteredRows);
                      downloadCSV(
                        `weekly-withdrawals-report-${new Date().toISOString().split('T')[0]}.csv`,
                        csvContent
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-[7px] bg-[var(--primary)] px-4 py-2 font-body-semi text-sm text-[#0A0A0A] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[var(--hover-green)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download CSV
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={() => setShowReportPreview(false)}
                    className="rounded-[7px] p-2 text-white/70 transition-all duration-150 hover:bg-white/10 hover:text-white"
                    aria-label="Close report"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="overflow-auto p-6" style={{ maxHeight: 'calc(90vh - 88px)' }}>
              {/* Summary Stats */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[7px] border border-[var(--border)] bg-white p-4">
                  <div className="text-sm font-body-semi text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                    Total Withdrawals
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-[#0A0A0A]">
                    {filteredRows.length}
                  </div>
                </div>
                <div className="rounded-[7px] border border-[var(--border)] bg-white p-4">
                  <div className="text-sm font-body-semi text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                    Date Range
                  </div>
                  <div className="mt-2 text-sm font-body text-[#0A0A0A]">
                    {new Date(startISO).toLocaleDateString()} - {new Date(endISO).toLocaleDateString()}
                  </div>
                </div>
                <div className="rounded-[7px] border border-[var(--border)] bg-white p-4">
                  <div className="text-sm font-body-semi text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                    Advisor Scope
                  </div>
                  <div className="mt-2 text-sm font-body text-[#0A0A0A]">
                    {advisor?.scope}
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <WithdrawalDigestEmail digest={digest} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
