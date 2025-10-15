import React from 'react';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Term } from './types';

interface PlanHeaderProps {
  currentPlanData: Term[];
  durationYears?: number;
  isEditMode: boolean;
  isSpaceView: boolean;
  onToggleView: () => void;
  onAddEvent: () => void;
}

export function PlanHeader({
  currentPlanData,
  durationYears,
  isEditMode,
  isSpaceView,
  onToggleView,
  onAddEvent
}: PlanHeaderProps) {
  const totalCredits = currentPlanData.reduce((total, term) => {
    const termCredits = term.credits_planned ||
                       (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);
  const totalCourses = currentPlanData.reduce((total, term) => total + (term.courses?.length ?? 0), 0);
  const totalTerms = currentPlanData.length;

  // Aggregate the key plan stats so we can surface them using the same stat-card language as the dashboard.
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
    <section className="rounded-[28px] border border-[color-mix(in_srgb,rgba(10,31,26,0.16)_30%,var(--border)_70%)] bg-white p-6 shadow-[0_42px_120px_-68px_rgba(8,35,24,0.55)]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
            Plan Overview
          </span>
          <h2 className="font-header text-2xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
            Graduation roadmap snapshot
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
            Quickly confirm credits, pacing, and milestones before you dive into each term.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isEditMode && (
            <button
              type="button"
              onClick={onAddEvent}
              className="inline-flex items-center gap-2 rounded-[16px] border border-[color-mix(in_srgb,var(--primary)_48%,transparent)] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-4 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary)_22%)] shadow-[0_28px_68px_-48px_rgba(18,249,135,0.55)] transition-all duration-150 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Add milestone
            </button>
          )}
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 rounded-[16px] border border-[color-mix(in_srgb,var(--muted-foreground)_45%,transparent)] bg-[color-mix(in_srgb,var(--muted)_26%,transparent)] px-4 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_84%,var(--muted-foreground)_16%)] shadow-[0_24px_60px_-44px_rgba(8,35,24,0.45)] transition-all duration-150 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,var(--muted)_32%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
          >
            <ViewIcon size={18} strokeWidth={2} aria-hidden="true" />
            {isSpaceView ? 'Return to detail view' : 'Open space view'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex flex-col gap-2 rounded-[20px] border px-4 py-3',
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
    </section>
  );
}
