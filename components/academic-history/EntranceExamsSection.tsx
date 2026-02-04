'use client';

/**
 * EntranceExamsSection Component
 * Displays ACT/SAT entrance exam scores
 * Matches Progress Overview styling
 */

import { GraduationCap } from 'lucide-react';
import type { EntranceExam } from '@/lib/dummy-data/academicHistory';

interface EntranceExamsSectionProps {
  exams: EntranceExam[];
}

export function EntranceExamsSection({
  exams,
}: EntranceExamsSectionProps) {
  if (!exams || exams.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Section Header */}
      <div className="border-b-2 border-zinc-900 bg-zinc-900 px-6 py-4 dark:border-zinc-100 dark:bg-zinc-100">
        <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
          Entrance Exams
        </h3>
        <p className="font-body mt-1 text-xs text-zinc-300 dark:text-zinc-700">
          ACT and SAT scores
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4 transition-colors hover:bg-[var(--muted)]/50"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <GraduationCap size={24} className="text-[var(--primary)]" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <span className="font-body-semi text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {exam.name}
                </span>
                <div className="mt-1">
                  <span className="font-header text-2xl font-black text-[var(--foreground)]">
                    {exam.score}
                  </span>
                  {exam.scoreType && (
                    <span className="font-body ml-2 text-xs text-[var(--muted-foreground)]">
                      {exam.scoreType}
                    </span>
                  )}
                </div>
                {exam.date && (
                  <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">
                    {exam.date}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
