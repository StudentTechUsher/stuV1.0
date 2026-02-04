'use client';

/**
 * ExamCreditsSection Component
 * Displays AP/IB/CLEP exam credits with scores and equivalencies
 * Matches Progress Overview styling
 */

import { ArrowRight } from 'lucide-react';
import type { ExamCredit } from '@/lib/dummy-data/academicHistory';

interface ExamCreditsSectionProps {
  examCredits: ExamCredit[];
}

export function ExamCreditsSection({
  examCredits,
}: ExamCreditsSectionProps) {
  if (!examCredits || examCredits.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Section Header */}
      <div className="border-b-2 border-zinc-900 bg-zinc-900 px-6 py-4 dark:border-zinc-100 dark:bg-zinc-100">
        <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
          Exam Credits
        </h3>
        <p className="font-body mt-1 text-xs text-zinc-300 dark:text-zinc-700">
          Advanced Placement, IB, and CLEP test credits
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examCredits.map((exam) => (
            <div
              key={exam.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--primary)]/5 p-4 transition-all hover:border-[var(--primary)] hover:shadow-sm"
            >
              {/* Header with badge and score */}
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[var(--primary)]/20 px-2 py-1 font-body-semi text-xs font-bold text-[var(--primary)]">
                  {exam.type}
                </span>
                <span className="font-body-semi text-lg font-black text-[var(--foreground)]">
                  {exam.score}
                </span>
              </div>

              {/* Exam subject */}
              <h4 className="font-body-semi mb-3 text-sm font-bold text-[var(--foreground)]">
                {exam.subject}
              </h4>

              {/* Equivalency mapping */}
              <div className="flex items-start gap-2 border-t border-[var(--border)] pt-3">
                <ArrowRight
                  size={14}
                  className="text-[var(--primary)] mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-body text-xs text-[var(--foreground)] line-clamp-2">
                    {exam.equivalent}
                  </span>
                  <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">
                    {exam.hours} credits • {exam.grade}
                  </p>
                </div>
              </div>

              {/* Year if available */}
              {exam.year && (
                <p className="font-body mt-3 text-xs text-[var(--muted-foreground)]">
                  Year: {exam.year}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
