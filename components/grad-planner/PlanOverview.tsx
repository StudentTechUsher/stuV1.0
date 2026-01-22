import React from 'react';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Term } from './types';

interface PlanOverviewProps {
  currentPlanData: Term[];
  durationYears?: number;
  fulfilledRequirements: string[];
  isEditMode: boolean;
  isSpaceView: boolean;
  onToggleView: () => void;
  onAddEvent: () => void;
  programs?: Array<{ id: number; name: string }>;
  createdWithTranscript?: boolean;
  planName?: string;
  estGradSem?: string;
}

export function PlanOverview({
  currentPlanData,
  durationYears,
  fulfilledRequirements,
  isEditMode,
  isSpaceView,
  onToggleView,
  onAddEvent,
  programs,
  createdWithTranscript,
  planName,
  estGradSem
}: PlanOverviewProps) {
  const totalCredits = currentPlanData.reduce((total, term) => {
    const termCredits = term.credits_planned ||
                       (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);
  const totalCourses = currentPlanData.reduce((total, term) => total + (term.courses?.length ?? 0), 0);
  const totalTerms = currentPlanData.length;

  // Aggregate the key plan stats - styling matches Progress Overview
  const statCards: Array<{ label: string; value: string; style: 'completed' | 'planned' | 'duration' }> = [
    { label: 'Total Credits', value: totalCredits.toString(), style: 'completed' },
    { label: 'Total Courses', value: totalCourses.toString(), style: 'completed' },
    { label: 'Terms Planned', value: totalTerms.toString(), style: 'planned' },
  ];

  if (durationYears) {
    statCards.push({
      label: 'Duration',
      value: `${durationYears} yr${durationYears > 1 ? 's' : ''}`,
      style: 'duration',
    });
  }

  const ViewIcon = isSpaceView ? Minimize2 : Maximize2;

  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)] bg-white dark:bg-[var(--card)] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
            Plan Overview
          </span>
          <h2 className="font-header text-2xl font-black tracking-tight text-[var(--foreground)]">
            Graduation roadmap snapshot
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            Quickly confirm credits, pacing, and milestones before you dive into each term.
          </p>

          {/* Plan Details */}
          {(planName || estGradSem) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {planName && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm font-medium border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] rounded-xl bg-[var(--muted)] text-[var(--foreground)] pointer-events-none"
                  />
                </div>
              )}
              {estGradSem && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                    Graduation Semester
                  </label>
                  <input
                    type="text"
                    value={estGradSem}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm font-medium border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] rounded-xl bg-[var(--muted)] text-[var(--foreground)] pointer-events-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Programs and Graduation Info */}
          <div className="flex flex-wrap items-center gap-2">
            {programs && programs.length > 0 && programs.map((program) => (
              <span
                key={program.id}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black shadow-sm"
                style={{
                  backgroundColor: '#12F987',
                }}
              >
                {program.name}
              </span>
            ))}
            {/* Transcript Status Badge */}
            {createdWithTranscript !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                  createdWithTranscript
                    ? "border-[color-mix(in_srgb,#12F987_20%,transparent)] bg-[color-mix(in_srgb,#12F987_10%,transparent)] text-[#12F987]"
                    : "border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                {createdWithTranscript ? 'Created with transcript' : 'Created without transcript'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={onAddEvent}
              className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,#a855f7_20%,transparent)] bg-[color-mix(in_srgb,#a855f7_12%,transparent)] px-4 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a855f7]"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Add milestone
            </button>
          )}
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--muted)] px-4 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
          >
            <ViewIcon size={16} strokeWidth={2} aria-hidden="true" />
            {isSpaceView ? 'Return to Detail View' : 'Zoom Out'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          // Completed style: black with green accent
          if (stat.style === 'completed') {
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl border-2 border-[#12F987] bg-[var(--foreground)] px-4 py-3 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#12F987] shadow-md">
                  <span className="text-lg font-black text-black">{stat.value}</span>
                </div>
                <span className="text-sm font-bold text-[var(--background)]">
                  {stat.label}
                </span>
              </div>
            );
          }

          // Planned style: light grey like Progress Overview
          if (stat.style === 'planned') {
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-300 dark:bg-zinc-600 px-4 py-3 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-md">
                  <span className="text-lg font-black text-[var(--foreground)]">{stat.value}</span>
                </div>
                <span className="text-sm font-bold text-black dark:text-white">
                  {stat.label}
                </span>
              </div>
            );
          }

          // Duration style: white, no circle
          return (
            <div
              key={stat.label}
              className="flex items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-white dark:bg-[var(--card)] px-4 py-3 shadow-sm"
            >
              <span className="text-2xl font-black text-[var(--foreground)]">{stat.value}</span>
              <span className="text-sm font-bold text-[var(--muted-foreground)]">
                {stat.label}
              </span>
            </div>
          );
        })}
      </div>

      {fulfilledRequirements.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
            Requirements Met
          </span>
          <div className="flex flex-wrap gap-2">
            {fulfilledRequirements.map((requirement) => (
              <span
                key={requirement}
                className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,#12F987_20%,transparent)] bg-[color-mix(in_srgb,#12F987_10%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#12F987]"
              >
                {requirement}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
