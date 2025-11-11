/**
 * Distribution Card Component
 * Shows required grade distribution table and summary
 */

import { ALL_GRADES, type GradeKey } from '@/lib/gpa/gradeScale';
import { formatDistributionMessage } from '@/lib/gpa/core';
import { BarChart3, AlertTriangle } from 'lucide-react';

interface DistributionCardProps {
  distribution: Record<GradeKey, number> | null;
  feasible: boolean | null;
  isLoading: boolean;
}

export function DistributionCard({
  distribution,
  feasible,
  isLoading,
}: DistributionCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Bold black header matching design system */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
        <h2 className="flex items-center gap-2 font-header text-sm font-bold uppercase tracking-wider text-white">
          <BarChart3 size={18} />
          Required Grade Distribution
        </h2>
      </div>

      <div className="p-6">
        {!distribution || isLoading ? (
          <div className="flex items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] py-12">
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              {isLoading
                ? '📊 Computing distribution...'
                : '💡 Set a target GPA to see the required grade distribution'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Sentence */}
            <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-4">
              <p className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                {formatDistributionMessage(distribution)}
              </p>
            </div>

            {/* Distribution Grid - More visual than table */}
            <div className="space-y-3">
              {ALL_GRADES.map((grade) => {
                const count = distribution[grade] ?? 0;
                // Only show grades with count > 0
                if (count === 0) return null;

                const maxCount = Math.max(...Object.values(distribution).filter((v) => v > 0), 1);
                const percentage = (count / maxCount) * 100;

                const getGradeColor = (grade: GradeKey) => {
                  switch (grade) {
                    case 'A':
                      return { bg: 'bg-emerald-500', light: 'bg-emerald-50' };
                    case 'A-':
                    case 'B+':
                      return { bg: 'bg-emerald-400', light: 'bg-emerald-50' };
                    case 'B':
                      return { bg: 'bg-blue-500', light: 'bg-blue-50' };
                    case 'B-':
                    case 'C+':
                      return { bg: 'bg-amber-400', light: 'bg-amber-50' };
                    case 'C':
                      return { bg: 'bg-orange-500', light: 'bg-orange-50' };
                    default:
                      return { bg: 'bg-red-500', light: 'bg-red-50' };
                  }
                };

                const colors = getGradeColor(grade);

                return (
                  <div key={grade} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                        {grade}
                      </span>
                      <span className={`font-body-semi text-sm font-bold ${colors.light} rounded px-2 py-1`}>
                        {count} course{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_60%,transparent)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feasibility Note */}
            {!feasible && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-body-semi text-sm font-semibold text-amber-900">
                      Challenging Target
                    </p>
                    <p className="font-body mt-1 text-xs text-amber-800">
                      This target GPA may be difficult to achieve with your current remaining courses. Consider adjusting your goal.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
