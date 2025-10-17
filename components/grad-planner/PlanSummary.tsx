'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface PlanSummaryProps {
  planData: Term[];
  durationYears?: number;
  fulfilledRequirements: string[];
}

const summaryPill =
  'inline-flex items-center gap-2 rounded-[7px] border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] shadow-[0_26px_70px_-50px_rgba(8,35,24,0.45)]';

/**
 * Compact summary strip that mirrors the dashboard stat language while keeping requirements visible.
 */
export function PlanSummary({ planData, durationYears, fulfilledRequirements }: PlanSummaryProps) {
  const totalCredits = planData.reduce((total, term) => {
    const termCredits =
      term.credits_planned ||
      (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);

  const basePills = [
    {
      key: 'terms',
      label: `${planData.length} term${planData.length === 1 ? '' : 's'} planned`,
      tone: 'primary',
    },
    durationYears
      ? {
          key: 'duration',
          label: `${durationYears} year${durationYears === 1 ? '' : 's'}`,
          tone: 'neutral',
        }
      : null,
    {
      key: 'credits',
      label: `Total Credits • ${totalCredits}`,
      tone: 'accent',
    },
  ].filter(Boolean) as Array<{ key: string; label: string; tone: 'primary' | 'neutral' | 'accent' }>;

  const toneMap: Record<typeof basePills[number]['tone'], string> = {
    primary:
      'border-[color-mix(in_srgb,var(--primary)_48%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]',
    accent:
      'border-[color-mix(in_srgb,#0a1f1a_18%,var(--primary)_32%)] bg-[color-mix(in_srgb,var(--primary)_12%,white_88%)] text-[color-mix(in_srgb,#043322_60%,var(--primary)_40%)]',
    neutral:
      'border-[color-mix(in_srgb,var(--muted-foreground)_42%,transparent)] bg-[color-mix(in_srgb,var(--muted)_26%,transparent)] text-[color-mix(in_srgb,var(--foreground)_82%,var(--muted-foreground)_18%)]',
  };

  return (
    <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.16)_28%,var(--border)_72%)] bg-white px-5 py-4 shadow-[0_40px_110px_-68px_rgba(8,35,24,0.55)]">
      <div className="flex flex-wrap items-center gap-2">
        {basePills.map((pill) => (
          <span key={pill.key} className={cn(summaryPill, toneMap[pill.tone])}>
            {pill.label}
          </span>
        ))}
      </div>

      {fulfilledRequirements.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
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
