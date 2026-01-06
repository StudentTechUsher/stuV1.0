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

  // Aggregate the key plan stats
  const statCards: Array<{ label: string; value: string; tone: 'primary' | 'neutral' | 'muted' }> = [
    { label: 'Total Credits', value: totalCredits.toString(), tone: 'primary' },
    { label: 'Total Courses', value: totalCourses.toString(), tone: 'primary' },
    { label: 'Terms Planned', value: totalTerms.toString(), tone: 'neutral' },
  ];

  if (durationYears) {
    statCards.push({
      label: 'Duration',
      value: `${durationYears} yr${durationYears > 1 ? 's' : ''}`,
      tone: 'muted',
    });
  }

  const toneStyles: Record<typeof statCards[number]['tone'], string> = {
    primary:
      'border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_18%,var(--card)_82%)] text-[color-mix(in_srgb,var(--foreground)_82%,var(--primary)_18%)] shadow-[0_32px_80px_-54px_rgba(18,249,135,0.65)]',
    neutral:
      'border-[color-mix(in_srgb,var(--muted-foreground)_44%,transparent)] bg-[color-mix(in_srgb,var(--muted)_30%,var(--card)_70%)] text-[color-mix(in_srgb,var(--foreground)_84%,var(--muted-foreground)_16%)] shadow-[0_26px_70px_-52px_rgba(8,35,24,0.35)]',
    muted:
      'border-[color-mix(in_srgb,var(--muted-foreground)_32%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,white_10%)] text-[color-mix(in_srgb,var(--foreground)_82%,var(--muted-foreground)_18%)] shadow-[0_22px_60px_-48px_rgba(8,35,24,0.25)]',
  };

  const ViewIcon = isSpaceView ? Minimize2 : Maximize2;

  return (
    <section className="rounded-lg border border-gray-400 bg-gray-200/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
            Plan Overview
          </span>
          <h2 className="font-header text-2xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
            Graduation roadmap snapshot
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
            Quickly confirm credits, pacing, and milestones before you dive into each term.
          </p>

          {/* Plan Details */}
          {(planName || estGradSem) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {planName && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
                  />
                </div>
              )}
              {estGradSem && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Graduation Semester
                  </label>
                  <input
                    type="text"
                    value={estGradSem}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
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
                className="inline-flex items-center rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,white)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary)_22%)]"
              >
                {program.name}
              </span>
            ))}
            {/* Transcript Status Badge */}
            {createdWithTranscript !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[7px] border px-3 py-1.5 text-xs font-semibold tracking-wide",
                  createdWithTranscript
                    ? "border-[color-mix(in_srgb,#10b981_38%,transparent)] bg-[color-mix(in_srgb,#10b981_15%,white)] text-[color-mix(in_srgb,var(--foreground)_78%,#10b981_22%)]"
                    : "border-[color-mix(in_srgb,#f59e0b_38%,transparent)] bg-[color-mix(in_srgb,#f59e0b_15%,white)] text-[color-mix(in_srgb,var(--foreground)_78%,#f59e0b_22%)]"
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="inline-flex items-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,#a855f7_48%,transparent)] bg-[color-mix(in_srgb,#a855f7_16%,transparent)] px-4 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_78%,#a855f7_22%)] shadow-[0_28px_68px_-48px_rgba(168,85,247,0.45)] transition-all duration-150 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,#a855f7_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,#a855f7_75%,black_25%)]"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Add milestone
            </button>
          )}
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--muted-foreground)_45%,transparent)] bg-[color-mix(in_srgb,var(--muted)_26%,transparent)] px-4 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_84%,var(--muted-foreground)_16%)] shadow-[0_24px_60px_-44px_rgba(8,35,24,0.45)] transition-all duration-150 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,var(--muted)_32%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
          >
            <ViewIcon size={18} strokeWidth={2} aria-hidden="true" />
            {isSpaceView ? 'Return to Detail View' : 'Zoom Out'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col gap-2 rounded-[7px] border px-4 py-3',
              toneStyles[stat.tone]
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]">
              {stat.label}
            </span>
            <span className="text-xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {fulfilledRequirements.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
            Requirements Met
          </span>
          <div className="flex flex-wrap gap-2">
            {fulfilledRequirements.map((requirement) => (
              <span
                key={requirement}
                className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]"
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
