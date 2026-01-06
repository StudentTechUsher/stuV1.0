'use client';

import { useState, useEffect, useCallback } from 'react';
import { StuLoader } from '@/components/ui/StuLoader';
import { formatTermCode } from '@/lib/terms';
import type { ForecastResponse, ForecastRow } from '@/app/api/admin/forecast/route';

function DetailRow({ row }: { row: ForecastRow }) {
  if (!row.detail) return null;

  const { time_of_day, modality, professors } = row.detail;
  const total = time_of_day.morning + time_of_day.afternoon + time_of_day.evening;

  return (
    <div className="space-y-4 rounded-xl bg-[color-mix(in_srgb,var(--muted)_30%,transparent)] p-5">
      <h4 className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
        1-Semester-Ahead Details
      </h4>

      {/* Time of Day Preferences */}
      <div className="space-y-3">
        <p className="font-body-semi text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Time of Day Preferences
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Morning */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-zinc-900 dark:text-zinc-100">Morning: {time_of_day.morning}</span>
              <span className="font-bold text-[#FDCC4A]">
                {total > 0 ? Math.round((time_of_day.morning / total) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FDCC4A] to-[#FDB94E] transition-all duration-500"
                style={{ width: `${total > 0 ? (time_of_day.morning / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Afternoon */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-zinc-900 dark:text-zinc-100">Afternoon: {time_of_day.afternoon}</span>
              <span className="font-bold text-[#2196f3]">
                {total > 0 ? Math.round((time_of_day.afternoon / total) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2196f3] to-[#42a5f5] transition-all duration-500"
                style={{ width: `${total > 0 ? (time_of_day.afternoon / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Evening */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-zinc-900 dark:text-zinc-100">Evening: {time_of_day.evening}</span>
              <span className="font-bold text-[#ef4444]">
                {total > 0 ? Math.round((time_of_day.evening / total) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#f87171] transition-all duration-500"
                style={{ width: `${total > 0 ? (time_of_day.evening / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modality Preferences */}
      <div className="space-y-2">
        <p className="font-body-semi text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Modality Preferences
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2196f3] bg-[color-mix(in_srgb,#2196f3_8%,transparent)] px-3 py-1 text-xs font-semibold text-[#2196f3]">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            In-Person: {modality.in_person}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDCC4A] bg-[color-mix(in_srgb,#FDCC4A_8%,transparent)] px-3 py-1 text-xs font-semibold text-[#987A2D]">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
            </svg>
            Online: {modality.online}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ef4444] bg-[color-mix(in_srgb,#ef4444_8%,transparent)] px-3 py-1 text-xs font-semibold text-[#ef4444]">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd"/>
            </svg>
            Hybrid: {modality.hybrid}
          </span>
        </div>
      </div>

      {/* Top Professor Requests */}
      {professors && professors.length > 0 && (
        <div className="space-y-2">
          <p className="font-body-semi text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Top Professor Requests
          </p>
          <div className="flex flex-wrap gap-1.5">
            {professors.slice(0, 5).map((prof, i) => (
              <span
                key={i}
                className="rounded-md border border-[var(--border)] bg-white px-2.5 py-1 font-body text-xs font-medium text-[var(--foreground)]"
              >
                {prof}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseRow({ row, showDetail }: { row: ForecastRow; showDetail: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group border-b border-[var(--border)] transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]">
      {/* Main Row */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3.5 sm:px-6">
        {/* Expand Button */}
        <div className="flex w-8 items-center justify-center">
          {showDetail && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Course Info */}
        <div className="min-w-0">
          <p className="font-body-semi text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {row.subject} {row.number}
          </p>
          <p className="font-body mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
            {row.title}
          </p>
        </div>

        {/* Demand Count Badge */}
        <div className="flex justify-center">
          <span className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] px-3 font-body-semi text-sm font-bold text-white shadow-sm">
            {row.demand_count}
          </span>
        </div>

        {/* Credits */}
        <div className="flex w-16 justify-center">
          <span className="font-body-semi text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {row.credits}
          </span>
        </div>
      </div>

      {/* Detail Expansion */}
      {showDetail && (
        <div
          className={`overflow-hidden transition-all duration-300 ${
            open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-4 sm:px-6">
            <DetailRow row={row} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForecastPage() {
  const [semestersAhead, setSemestersAhead] = useState<1 | 2 | 3 | 4>(1);
  const [subject, setSubject] = useState('');
  const [minDemand, setMinDemand] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        semesters_ahead: String(semestersAhead),
      });
      if (subject) params.set('subject', subject);
      if (minDemand) params.set('min', minDemand);
      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/forecast?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch forecast');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [minDemand, search, semestersAhead, subject]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-header text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Course Demand Forecasting
        </h1>
        <p className="font-body text-sm text-[var(--muted-foreground)]">
          Predict student demand for upcoming semesters
        </p>
      </div>

      {/* Mock Data Alert */}
      {data?.is_mock && (
        <div className="flex items-start gap-3 rounded-xl border border-[#2196f3] bg-[color-mix(in_srgb,#2196f3_5%,transparent)] p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#2196f3]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-body-semi text-sm font-semibold text-[#2196f3]">Proof of Concept Data</p>
            <p className="font-body mt-1 text-xs text-[color-mix(in_srgb,#2196f3_90%,black)]">
              No plan data available yet—showing PoC estimates
            </p>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
        {/* Card Header */}
        <div className="border-b-2 px-6 py-3.5" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
          <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
            Filters & Options
          </h3>
        </div>

        {/* Card Content */}
        <div className="space-y-6 p-6">
          {/* Semester Selection */}
          <div className="space-y-2">
            <label className="font-body-semi text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Forecast Period
            </label>
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3, 4] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSemestersAhead(value)}
                  className={`rounded-lg px-4 py-2.5 font-body-semi text-sm font-semibold transition-all duration-200 ${
                    semestersAhead === value
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] text-white shadow-sm'
                      : 'border border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]'
                  }`}
                >
                  {value} Semester{value > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Subject Filter */}
            <div className="space-y-2">
              <label htmlFor="subject-filter" className="font-body-semi text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Subject
              </label>
              <input
                id="subject-filter"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="CS, MATH..."
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Min Demand Filter */}
            <div className="space-y-2">
              <label htmlFor="min-demand-filter" className="font-body-semi text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Min Demand
              </label>
              <input
                id="min-demand-filter"
                type="number"
                value={minDemand}
                onChange={(e) => setMinDemand(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Search */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <label htmlFor="search-filter" className="font-body-semi text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Search
              </label>
              <input
                id="search-filter"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Course code or title..."
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 font-body text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchForecast}
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] px-4 py-2.5 font-body-semi text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {loading ? 'Loading...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Term Info */}
      {data && (
        <p className="font-body text-sm text-[var(--muted-foreground)]">
          Forecasting for: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.term_codes.map(formatTermCode).join(', ')}</span>
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-16 shadow-sm">
          <StuLoader variant="card" text="Generating forecast data..." />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#ef4444] bg-[color-mix(in_srgb,#ef4444_5%,transparent)] p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-body-semi text-sm font-semibold text-[#ef4444]">Error</p>
            <p className="font-body mt-1 text-xs text-[color-mix(in_srgb,#ef4444_90%,black)]">{error}</p>
          </div>
        </div>
      ) : data && data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
            <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-header-bold mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">No Results Found</h3>
          <p className="font-body text-sm text-[var(--muted-foreground)]">No courses match your current filters. Try adjusting your search criteria.</p>
        </div>
      ) : data ? (
        <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm">
          {/* Table Header */}
          <div className="border-b-2 px-4 py-3.5 sm:px-6" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4">
              <div className="w-8" />
              <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">Course</h3>
              <div className="flex justify-center">
                <span className="font-header text-sm font-bold uppercase tracking-wider text-white">Students</span>
              </div>
              <div className="flex w-16 justify-center">
                <span className="font-header text-sm font-bold uppercase tracking-wider text-white">Credits</span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="max-h-[600px] overflow-y-auto">
            {data.rows.map((row) => (
              <CourseRow
                key={row.course_id}
                row={row}
                showDetail={semestersAhead === 1 && !!row.detail}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
