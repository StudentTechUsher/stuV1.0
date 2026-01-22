'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequirementBubbles } from './RequirementBubbles';
import { CourseMoveField } from './CourseMoveField';
import type { Course, Term as PlannerTerm } from './types';
import { getCategoryColorFromFulfills, getCompletedCardBg } from './style-utils';

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
  const categoryColor = getCategoryColorFromFulfills(course.fulfills || []);

  // Determine background color based on completion status and category
  const getBackgroundStyle = () => {
    if (isCompleted) {
      return { backgroundColor: getCompletedCardBg(categoryColor) };
    }
    return {};
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...getBackgroundStyle() }}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative flex flex-col gap-4 rounded-xl border p-4 text-sm shadow-sm transition-all duration-200 ease-out',
        isCompleted
          ? 'border-transparent'
          : 'border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)]',
        isEditMode
          ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md'
          : 'cursor-default',
        hasMoved && 'border-[var(--action-edit)] ring-2 ring-[var(--action-edit)] ring-opacity-30'
      )}
    >
      <div className="flex items-start gap-3">
        {isEditMode && (
          <span
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors duration-200 group-hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] group-hover:text-[var(--foreground)]"
            aria-hidden="true"
          >
            <GripVertical size={18} strokeWidth={2.25} />
          </span>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {course.code}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--foreground)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--background)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
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
              <h4 className="font-body-semi text-sm font-bold leading-5 text-[var(--foreground)]">
                {course.title}
              </h4>
            </div>

            {isEditMode && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  // TODO: Add course edit functionality
                }}
                aria-label={`Edit ${course.code}`}
              >
                <Pencil size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Credits
              </span>
              <span className="text-xs font-black text-[var(--foreground)]">
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
          <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--muted)] px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
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
              className="flex items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3 py-2 text-sm font-bold text-[var(--foreground)] transition-all hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] hover:shadow-sm"
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
