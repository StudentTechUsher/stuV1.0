'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequirementBubbles } from './RequirementBubbles';
import { CourseMoveField } from './CourseMoveField';
import type { Course, Term as PlannerTerm } from './types';

interface DraggableCourseProps {
  course: Course;
  termIndex: number;
  courseIndex: number;
  isEditMode: boolean;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
  currentPlanData: PlannerTerm[];
  movedCourses: Set<string>;
}

export function DraggableCourse({
  course,
  termIndex,
  courseIndex,
  isEditMode,
  onMoveCourse,
  onSubstituteCourse,
  currentPlanData,
  movedCourses,
}: Readonly<DraggableCourseProps>) {
  const courseId = `course-${termIndex}-${courseIndex}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: courseId,
    data: {
      course,
      termIndex,
      courseIndex,
    },
    disabled: !isEditMode,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0 : 1,
      }
    : undefined;

  const courseIdentifier = `${course.code}-${course.title}`;
  const hasMoved = movedCourses.has(courseIdentifier);
  const isCompleted = course.isCompleted || false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative flex flex-col gap-4 rounded-[7px] border p-4 text-sm shadow-[0_38px_88px_-56px_rgba(8,35,24,0.55)] transition-all duration-200 ease-out',
        isCompleted
          ? 'border-green-200 bg-green-50/50'
          : 'border-[color-mix(in_srgb,var(--border)_82%,transparent_18%)] bg-white/95',
        isEditMode
          ? 'cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--primary)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_6%,#ffffff_94%)] hover:shadow-[0_32px_68px_-48px_rgba(18,249,135,0.45)]'
          : 'cursor-default',
        hasMoved && 'border-[var(--action-edit)] shadow-[0_30px_62px_-46px_rgba(253,204,74,0.55)]'
      )}
    >
      <div className="flex items-start gap-3">
        {isEditMode && (
          <span
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[color-mix(in_srgb,var(--foreground)_75%,var(--primary)_25%)] transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
            aria-hidden="true"
          >
            <GripVertical size={18} strokeWidth={2.25} />
          </span>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--muted)_38%,transparent)] bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--muted-foreground)_75%,var(--foreground)_25%)]">
                {course.code}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-600/30 bg-green-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-green-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Completed
                </span>
              )}
              <h4 className="font-body-semi text-base font-semibold leading-5 text-[color-mix(in_srgb,var(--foreground)_90%,var(--primary)_10%)]">
                {course.title}
              </h4>
            </div>

            {isEditMode && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[color-mix(in_srgb,var(--primary)_60%,var(--foreground)_40%)] transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  // TODO: Add course edit functionality
                }}
                aria-label={`Edit ${course.code}`}
              >
                <Pencil size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
            <span className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
                Credits
              </span>
              <span className="text-[12px] font-bold text-[color-mix(in_srgb,var(--foreground)_85%,var(--primary)_15%)]">
                {course.credits}
              </span>
            </span>
          </div>

          {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
            <RequirementBubbles fulfills={course.fulfills} />
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--muted)_38%,transparent)] bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
              Move
            </span>
            <CourseMoveField
              currentTerm={termIndex + 1}
              maxTerms={currentPlanData.length}
              course={course}
              termIndex={termIndex}
              courseIndex={courseIndex}
              onMoveCourse={onMoveCourse}
            />
          </div>
          {onSubstituteCourse && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSubstituteCourse(termIndex, courseIndex);
              }}
              className="flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-3 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_88%,var(--primary)_12%)] transition-all hover:bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15l3 3 3-3" />
              </svg>
              Substitute This Course
            </button>
          )}
        </div>
      )}
    </div>
  );
}
