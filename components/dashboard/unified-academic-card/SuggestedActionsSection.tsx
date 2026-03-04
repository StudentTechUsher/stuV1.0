'use client';

import { Lightbulb, ArrowRight } from 'lucide-react';

type SuggestedAction = {
  id: string;
  title: string;
  detail: string;
};

const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    id: 'course-skill-match',
    title: 'Add IS 566 - Data Engineering to Your Plan',
    detail: 'Teaches skills employers for your role need.',
  },
  {
    id: 'plan-refresh',
    title: 'Refresh Your Grad Plan',
    detail: 'You updated your grad plan 3 months ago. Update it again?',
  },
  {
    id: 'advisor-checkin',
    title: 'Schedule an Advisor Check-In',
    detail: 'Review your next two terms before registration opens.',
  },
];

/**
 * Compact recommendations panel for suggested student actions.
 * Content is intentionally hard-coded for initial UX iteration.
 */
export function SuggestedActionsSection() {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_16%,transparent)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/40">
          <Lightbulb size={14} className="text-amber-700 dark:text-amber-300" />
        </div>
        <h4 className="font-header-bold text-xs uppercase tracking-wide text-[var(--foreground)]">
          Suggested Actions
        </h4>
      </div>

      <div className="space-y-2">
        {SUGGESTED_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="w-full rounded-lg border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[var(--card)] px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                  {action.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {action.detail}
                </p>
              </div>
              <ArrowRight size={14} className="mt-1 shrink-0 text-[var(--muted-foreground)]" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
