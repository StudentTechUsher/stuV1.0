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
  currentPlanData: PlannerTerm[];
  movedCourses: Set<string>;
}

export function DraggableCourse({
  course,
  termIndex,
  courseIndex,
  isEditMode,
  onMoveCourse,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative flex flex-col gap-4 rounded-[7px] border border-[color-mix(in_srgb,var(--border)_82%,transparent_18%)] bg-white/95 p-4 text-sm shadow-[0_38px_88px_-56px_rgba(8,35,24,0.55)] transition-all duration-200 ease-out',
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
      )}
    </div>
  );
}
