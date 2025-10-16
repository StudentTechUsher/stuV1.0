'use client';

import React from 'react';
import { ArrowRight, Info } from 'lucide-react';

interface MovedCourse {
  courseName: string;
  courseCode: string;
  fromTerm: number;
  toTerm: number;
}

interface ChangesSummaryBoxProps {
  movedCourses: MovedCourse[];
  hasSuggestions: boolean;
}

export default function ChangesSummaryBox({ movedCourses, hasSuggestions }: ChangesSummaryBoxProps) {
  if (movedCourses.length === 0 && !hasSuggestions) {
    return null;
  }

  return (
    <aside className="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto rounded-[7px] border border-[color-mix(in_srgb,var(--accent)_36%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,white_6%)] p-5 shadow-[0_48px_120px_-70px_rgba(8,35,24,0.55)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[7px] border border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color-mix(in_srgb,var(--foreground)_78%,var(--accent)_22%)]">
          <Info size={18} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-header text-base font-semibold text-[color-mix(in_srgb,var(--foreground)_90%,var(--accent)_10%)]">
            Recent changes
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
            Track advisor edits and course moves while you review the plan.
          </p>
        </div>
      </div>

      {movedCourses.length > 0 && (
        <div className="space-y-3 border-t border-[color-mix(in_srgb,var(--border)_80%,transparent_20%)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
            Courses moved
          </p>

          <ul className="space-y-3">
            {movedCourses.map((course, index) => (
              <li
                key={`${course.courseCode}-${course.courseName}-${index}`}
                className="rounded-[7px] border border-[color-mix(in_srgb,var(--border)_82%,transparent_18%)] bg-white/85 px-4 py-3 shadow-[0_26px_70px_-48px_rgba(8,35,24,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_90%,var(--accent)_10%)]">
                      {course.courseCode || course.courseName}
                    </p>
                    {course.courseCode && course.courseName && course.courseCode !== course.courseName && (
                      <p className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
                        {course.courseName}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                    #{index + 1}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-[7px] border border-[color-mix(in_srgb,#ff9f9f_65%,transparent)] bg-[color-mix(in_srgb,#fee2e2_75%,white_25%)] px-3 py-1 text-[11px] font-semibold text-[color-mix(in_srgb,#991b1b_80%,var(--foreground)_20%)]">
                    Term {course.fromTerm}
                  </span>
                  <ArrowRight size={14} strokeWidth={2.4} className="text-[color-mix(in_srgb,var(--muted-foreground)_60%,var(--foreground)_40%)]" />
                  <span className="inline-flex items-center rounded-[7px] border border-[color-mix(in_srgb,#a3e4c3_65%,transparent)] bg-[color-mix(in_srgb,#dcfce7_75%,white_25%)] px-3 py-1 text-[11px] font-semibold text-[color-mix(in_srgb,#166534_80%,var(--foreground)_20%)]">
                    Term {course.toTerm}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSuggestions && (
        <div className="mt-5 rounded-[7px] border border-[color-mix(in_srgb,#fb923c_52%,transparent)] bg-[color-mix(in_srgb,#fff7ed_88%,white_12%)] px-4 py-3 text-xs text-[color-mix(in_srgb,#9a3412_80%,var(--foreground)_20%)]">
          <p className="font-semibold">Advisor suggestions available</p>
          <p className="mt-1 leading-relaxed">
            Review the advisor notes section to make sure their feedback is captured.
          </p>
        </div>
      )}
    </aside>
  );
}
