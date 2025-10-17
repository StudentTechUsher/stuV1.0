'use client';

import React from 'react';
import { PencilLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableCourse } from './DraggableCourse';
import { DroppableTerm } from './DroppableTerm';
import type { Term as PlannerTerm } from './types';

interface TermCardProps {
  term: PlannerTerm;
  termIndex: number;
  isEditMode: boolean;
  currentPlanData: PlannerTerm[];
  modifiedTerms: Set<number>;
  movedCourses: Set<string>;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

const statBadgeBase =
  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_26px_60px_-42px_rgba(8,35,24,0.55)] transition-all duration-200';

/**
 * Visual + structural refresh for term cards in the grad planner.
 * Aligns with the dashboard card language by using softer surfaces,
 * stat pills, and clearer spacing while preserving existing drag / edit logic.
 */
export function TermCard({
  term,
  termIndex,
  isEditMode,
  currentPlanData,
  modifiedTerms,
  movedCourses,
  onMoveCourse,
}: Readonly<TermCardProps>) {
  const termCredits =
    term.credits_planned ||
    (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
  const totalCourses = term.courses?.length ?? 0;
  const visibleTermLabel = term.term?.trim() || `Term ${termIndex + 1}`;

  return (
    <DroppableTerm
      term={term}
      termIndex={termIndex}
      isEditMode={isEditMode}
      modifiedTerms={modifiedTerms}
    >
      <article
        className={cn(
          'relative flex h-full flex-col gap-5 rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.18)_32%,var(--border)_68%)] bg-white p-6 shadow-[0_40px_90px_-60px_rgba(8,35,24,0.85)] transition-all duration-200 ease-out',
          'backdrop-blur-[2px]'
        )}
        data-editable={isEditMode}
        style={{
          borderColor: isEditMode
            ? 'color-mix(in srgb, var(--primary) 35%, var(--border) 65%)'
            : 'color-mix(in srgb, rgba(10,31,26,0.25) 30%, var(--border) 70%)',
        }}
      >
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_78%,#0a1f1a_22%)]">
              Term {termIndex + 1}
            </span>
            <div className="flex items-center gap-2">
              <h3 className="font-header text-xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
                {visibleTermLabel}
              </h3>
              {isEditMode && (
                <span
                  className="flex h-6 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2 text-[11px] font-medium uppercase text-[color-mix(in_srgb,var(--foreground)_88%,var(--primary)_12%)]"
                  role="status"
                  aria-label="Editable term"
                >
                  <PencilLine size={14} strokeWidth={2} aria-hidden="true" />
                  Edit
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
           <span
              className={cn(
                statBadgeBase,
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200 hover:opacity-85 hover:-translate-y-[1px]"
              )}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <span className="font-bold text-base leading-none tracking-tight">
                {termCredits}
              </span>
              <span className="text-sm opacity-85">credits</span>
            </span>
           <span
              className={cn(
                statBadgeBase,
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200 hover:opacity-85 hover:-translate-y-[1px]"
              )}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <span className="font-bold text-base leading-none tracking-tight">
                {totalCourses}
              </span>
              <span className="text-sm opacity-85">courses</span>
            </span>
          </div>
        </header>

        {term.notes && (
          <section
            className="rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,var(--primary)_15%)] shadow-[0_16px_42px_-32px_rgba(18,249,135,0.6)]"
            aria-label="Term notes"
          >
            {term.notes}
          </section>
        )}

        {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
          <section className="flex flex-col gap-3" aria-label="Courses for this term">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
              Courses
            </span>
            <div className="flex flex-col gap-3">
              {term.courses.map((course, courseIndex) => {
                if (!course.code || !course.title) {
                  console.warn(`⚠️ Skipping invalid course in term ${termIndex + 1}:`, course);
                  return null;
                }

                return (
                  <DraggableCourse
                    key={`term-${termIndex}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`}
                    course={course}
                    courseIndex={courseIndex}
                    termIndex={termIndex}
                    isEditMode={isEditMode}
                    currentPlanData={currentPlanData}
                    onMoveCourse={onMoveCourse}
                    movedCourses={movedCourses}
                  />
                );
              }).filter(Boolean)}
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center rounded-[7px] border border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_38%,var(--border)_62%)] bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-4 py-10 text-sm font-medium text-[color-mix(in_srgb,var(--muted-foreground)_78%,var(--foreground)_22%)]">
            No courses defined for this term yet
          </div>
        )}
      </article>
    </DroppableTerm>
  );
}
