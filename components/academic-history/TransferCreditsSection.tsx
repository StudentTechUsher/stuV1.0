'use client';

/**
 * TransferCreditsSection Component
 * Displays transfer credits grouped by institution
 * Shows acceptance status and equivalency mappings
 * Matches Progress Overview styling
 */

import { ArrowRight, Building2 } from 'lucide-react';
import type { TransferInstitution } from '@/lib/dummy-data/academicHistory';

interface TransferCreditsSectionProps {
  institutions: TransferInstitution[];
}

export function TransferCreditsSection({
  institutions,
}: TransferCreditsSectionProps) {
  if (!institutions || institutions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Section Header */}
      <div className="border-b-2 border-zinc-900 bg-zinc-900 px-6 py-4 dark:border-zinc-100 dark:bg-zinc-100">
        <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
          Transfer Credits
        </h3>
        <p className="font-body mt-1 text-xs text-zinc-300 dark:text-zinc-700">
          Credits from other institutions and equivalencies
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {institutions.map((institution) => (
          <div key={institution.name} className="mb-6 last:mb-0">
            {/* Institution Header */}
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Building2 size={18} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <h4 className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                  {institution.name}
                </h4>
                {institution.location && (
                  <p className="font-body text-xs text-[var(--muted-foreground)]">
                    {institution.location}
                  </p>
                )}
                <p className="font-body mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Attended {institution.fromYear} to {institution.toYear}
                </p>
              </div>
            </div>

            {/* Transfer Course Cards */}
            <div className="space-y-3">
              {institution.courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-4 transition-colors hover:bg-[var(--muted)]/50"
                >
                  {/* Course Header */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-body-semi text-sm font-bold text-[var(--foreground)]">
                        {course.originalCode}
                      </span>
                      <p className="font-body mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
                        {course.originalTitle}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-body-semi text-xs font-semibold text-[var(--foreground)]">
                        {course.hours} cr
                      </span>
                      <p className="font-body text-xs text-[var(--muted-foreground)]">
                        {course.grade}
                      </p>
                    </div>
                  </div>

                  {/* Equivalency Mapping */}
                  <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                    {course.accepted && course.equivalent && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ArrowRight
                            size={14}
                            className="text-[var(--primary)] flex-shrink-0"
                          />
                          <span className="font-body text-xs text-[var(--foreground)] truncate">
                            {course.equivalent}
                          </span>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 font-body-semi text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                          Accepted
                        </span>
                      </div>
                    )}

                    {course.accepted === false && (
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 font-body-semi text-xs font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">
                        Not Accepted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
