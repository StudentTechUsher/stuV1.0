'use client';

import { useState } from 'react';
import CreditsPopover from './CreditsPopover';

// ============================================================================
// Types
// ============================================================================

type RequirementChip = {
  label: string;
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'magenta';
};

type CourseRow = {
  courseCode: string;
  title: string;
  section: string;
  difficulty: string;
  instructor: string;
  days: ('M' | 'T' | 'W' | 'Th' | 'F' | 'MW' | 'TTh' | 'Fri')[];
  time: string;
  location: string;
  hours: number;
  requirements: RequirementChip[];
  status?: 'active' | 'withdrawn';
};

interface SemesterResultsTableProps {
  termLabel: string;
  totalCredits: number;
  scheduleDifficulty?: string;
  addDropDeadline?: string;
  rows: CourseRow[];
  onWithdraw?: (courseCode: string) => void;
  onSectionClick?: (courseCode: string, section: string) => void;
  onInstructorClick?: (courseCode: string, instructor: string) => void;
  gradPlanEditUrl?: string;
}

// ============================================================================
// Subcomponents
// ============================================================================

function DayPill({ day }: { day: string }) {
  return (
    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide bg-[color-mix(in_srgb,var(--primary)_20%,white)] text-[var(--dark)] shadow-sm border border-[color-mix(in_srgb,var(--primary)_30%,white)]">
      {day}
    </span>
  );
}

function RequirementChip({ label, color }: RequirementChip) {
  // Map colors matching the dashboard (academic-progress-card.tsx)
  const colorMap = {
    green: 'bg-[color-mix(in_srgb,var(--primary)_18%,white)] text-[var(--dark)] border-[color-mix(in_srgb,var(--primary)_35%,white)]', // Major
    blue: 'bg-[color-mix(in_srgb,#2196f3_18%,white)] text-[#1565c0] border-[color-mix(in_srgb,#2196f3_35%,white)]', // GE
    purple: 'bg-[color-mix(in_srgb,#001F54_18%,white)] text-[#001F54] border-[color-mix(in_srgb,#001F54_35%,white)]', // Minor
    indigo: 'bg-[color-mix(in_srgb,#5E35B1_18%,white)] text-[#5E35B1] border-[color-mix(in_srgb,#5E35B1_35%,white)]', // Religion
    magenta: 'bg-[color-mix(in_srgb,#9C27B0_18%,white)] text-[#9C27B0] border-[color-mix(in_srgb,#9C27B0_35%,white)]', // Elective
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm border ${colorMap[color]}`}
      title={`Requirement: ${label}`}
      role="button"
      tabIndex={0}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SemesterResultsTable({
  termLabel,
  totalCredits,
  scheduleDifficulty = '?/5',
  addDropDeadline,
  rows: initialRows,
  onWithdraw,
  onSectionClick,
  onInstructorClick,
  gradPlanEditUrl,
}: SemesterResultsTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [announceMessage, setAnnounceMessage] = useState('');

  const handleWithdraw = (courseCode: string) => {
    setRows(prev =>
      prev.map(row =>
        row.courseCode === courseCode
          ? { ...row, status: row.status === 'withdrawn' ? 'active' : 'withdrawn' }
          : row
      )
    );

    const course = rows.find(r => r.courseCode === courseCode);
    const isWithdrawing = course?.status !== 'withdrawn';
    setAnnounceMessage(
      isWithdrawing
        ? `${courseCode} has been withdrawn`
        : `${courseCode} withdrawal has been cancelled`
    );

    onWithdraw?.(courseCode);
  };

  return (
    <div className="w-full">
      {/* Accessibility announcement region */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announceMessage}
      </div>

      {/* Header Bar */}
      <div
        className="rounded-t-xl px-6 py-5 border-b-2 bg-zinc-900 dark:bg-zinc-100"
        style={{
          borderColor: 'var(--primary)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Title */}
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 dark:text-zinc-900">
            {termLabel}
          </h2>

          {/* Right: Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-100 dark:text-zinc-900">
            <CreditsPopover credits={totalCredits} colorScheme="dark" gradPlanEditUrl={gradPlanEditUrl} />

            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 opacity-80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round"/>
              </svg>
              <span>{scheduleDifficulty} difficulty</span>
            </div>

            {addDropDeadline && (
              <div className="flex items-center gap-2">
                <span>Add/Drop:</span>
                <span className="font-semibold">{addDropDeadline}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Table Card - Enhanced with shadows and better separation */}
      <div
        className="rounded-b-xl overflow-x-auto"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <table
          className="w-full min-w-[900px]"
          role="table"
        >
          <thead>
            <tr
              className="border-b-2"
              style={{
                backgroundColor: 'var(--primary)',
              }}
            >
              <th scope="col" className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Course
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Sec
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Dif
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Instructor
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Schedule
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Location
              </th>
              <th scope="col" className="text-left px-3 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Hrs
              </th>
              <th scope="col" className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark)' }}>
                Requirement
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isWithdrawn = row.status === 'withdrawn';

              return (
                <tr
                  key={row.courseCode + idx}
                  className="border-b transition-all bg-white dark:bg-zinc-900 hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]"
                  style={{
                    borderColor: 'var(--border)',
                    opacity: isWithdrawn ? 0.5 : 1,
                  }}
                >
                  {/* Course */}
                  <td role="cell" className="px-6 py-4">
                    <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                      {row.courseCode}
                    </div>
                    <div className="text-xs mt-1 hidden sm:block font-medium" style={{ color: 'var(--muted-foreground)' }}>
                      {row.title}
                    </div>
                  </td>

                  {/* Section - Interactive */}
                  <td role="cell" className="px-3 py-4 text-sm">
                    <button
                      onClick={() => onSectionClick?.(row.courseCode, row.section)}
                      className="rounded-md px-2.5 py-1.5 -mx-2 -my-1 hover:bg-[color-mix(in_srgb,var(--primary)_12%,white)] hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 border border-transparent hover:border-[color-mix(in_srgb,var(--primary)_30%,white)]"
                      style={{
                        color: 'var(--foreground)',
                        fontWeight: 600,
                      }}
                      disabled={!onSectionClick || isWithdrawn}
                      aria-label={`Change section for ${row.courseCode}`}
                    >
                      {row.section}
                    </button>
                  </td>

                  {/* Difficulty */}
                  <td role="cell" className="px-3 py-4 text-sm tabular-nums font-semibold" style={{ color: 'var(--foreground)' }}>
                    {row.difficulty}
                  </td>

                  {/* Instructor - Interactive */}
                  <td role="cell" className="px-3 py-4 text-sm">
                    <button
                      onClick={() => onInstructorClick?.(row.courseCode, row.instructor)}
                      className="rounded-md px-2.5 py-1.5 -mx-2 -my-1 hover:bg-[color-mix(in_srgb,var(--primary)_12%,white)] hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 text-left border border-transparent hover:border-[color-mix(in_srgb,var(--primary)_30%,white)]"
                      style={{
                        color: 'var(--foreground)',
                        fontWeight: 600,
                      }}
                      disabled={!onInstructorClick || isWithdrawn}
                      aria-label={`Change instructor for ${row.courseCode}`}
                    >
                      {row.instructor}
                    </button>
                  </td>

                  {/* Schedule (Days + Time) */}
                  <td role="cell" className="px-3 py-4">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {row.days.map((day, i) => (
                        <DayPill key={i} day={day} />
                      ))}
                    </div>
                    <div className="text-xs tabular-nums font-semibold" style={{ color: 'var(--foreground)' }}>
                      {row.time}
                    </div>
                  </td>

                  {/* Location */}
                  <td role="cell" className="px-3 py-4 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {row.location}
                  </td>

                  {/* Hours */}
                  <td role="cell" className="px-3 py-4 text-base font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {row.hours.toFixed(1)}
                  </td>

                  {/* Requirements + Withdraw */}
                  <td role="cell" className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.requirements.map((req, i) => (
                        <RequirementChip key={i} {...req} />
                      ))}
                      <button
                        onClick={() => handleWithdraw(row.courseCode)}
                        className="ml-auto rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-[color-mix(in_srgb,var(--muted)_25%,white)] shadow-sm"
                        style={{
                          border: '1.5px solid var(--border)',
                          color: 'var(--foreground)',
                          backgroundColor: 'var(--card)',
                        }}
                        aria-label={`${isWithdrawn ? 'Undo withdrawal' : 'Withdraw'} from ${row.courseCode}`}
                      >
                        {isWithdrawn ? 'Withdrawn' : 'Withdraw'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Demo Wrapper Example
// ============================================================================

export function CourseSchedulerPage() {
  const [showResults, setShowResults] = useState(false);

  const mockRows: CourseRow[] = [
    {
      courseCode: 'M COM 320',
      title: 'Management Communication',
      section: '007',
      difficulty: '__/5',
      instructor: 'C Arkin Hill',
      days: ['MW'],
      time: '9:00-9:45',
      location: '200 RB',
      hours: 3.0,
      requirements: [
        { label: 'MAJOR 2.7', color: 'green' },
        { label: 'GE 4.1', color: 'blue' },
      ],
      status: 'active',
    },
    {
      courseCode: 'FIN 413',
      title: 'Real Estate Finance and Investment',
      section: '002',
      difficulty: '3/5',
      instructor: 'C Jonas Blackerton',
      days: ['TTh'],
      time: '10:30-11:45',
      location: '232 TNRB',
      hours: 3.0,
      requirements: [
        { label: 'MAJOR 5.6', color: 'green' },
        { label: 'MINOR 4.4', color: 'purple' },
      ],
      status: 'active',
    },
    {
      courseCode: 'REL C 200',
      title: 'The Eternal Family',
      section: '043',
      difficulty: '10/5',
      instructor: 'C Travis Searle',
      days: ['MW'],
      time: '13:00-13:45',
      location: '53 JSB',
      hours: 2.0,
      requirements: [
        { label: 'REL 4.1', color: 'indigo' },
      ],
      status: 'active',
    },
    {
      courseCode: 'ENT 101',
      title: 'Intro to Entrepreneurship',
      section: '001',
      difficulty: '0.5/5',
      instructor: 'C Taylor Halverson',
      days: ['Fri'],
      time: '9:30-12:15',
      location: '240 TNRB',
      hours: 3.0,
      requirements: [
        { label: 'ELECTIVE 1.3', color: 'magenta' },
      ],
      status: 'active',
    },
    {
      courseCode: 'IHUM 202',
      title: 'Western Humanities 2: Renaissance to the Present',
      section: '011',
      difficulty: '1.8/5',
      instructor: 'C Ralph Cunningham',
      days: ['TTh'],
      time: '13:00-13:45',
      location: '210 JFSB',
      hours: 3.0,
      requirements: [
        { label: 'GE 8.1', color: 'blue' },
      ],
      status: 'active',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Calendar Placeholder */}
      <div
        className="rounded-lg border-2 border-dashed p-12 text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
          Calendar Component Here
        </p>
      </div>

      {/* Generate Button */}
      {!showResults && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowResults(true)}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
            style={{
              backgroundColor: 'var(--primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-green)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
            }}
          >
            Generate New Schedule
          </button>
        </div>
      )}

      {/* Results Table */}
      {showResults && (
        <SemesterResultsTable
          termLabel="Winter 2025 Classes"
          totalCredits={14.0}
          scheduleDifficulty="?/5"
          addDropDeadline="12 Sept"
          rows={mockRows}
          onWithdraw={(courseCode) => {
            console.log(`Withdraw requested for ${courseCode}`);
          }}
        />
      )}
    </div>
  );
}
