'use client';

import React from 'react';
import { type ParsedCourse } from '@/lib/services/userCoursesService';

interface CourseRowProps {
  course: ParsedCourse;
  showTerm?: boolean;
  editable?: boolean;
  onEdit?: (course: ParsedCourse) => void;
}

/**
 * Displays a single course in a row format matching Progress Overview styling.
 * Shows course code, title, credits, grade, and optional term.
 */
export function CourseRow({
  course,
  showTerm = false,
  editable = false,
  onEdit,
}: CourseRowProps) {
  const isCompleted = course.grade && course.grade !== 'IP' && course.grade !== 'In Progress' && course.grade !== '';
  const isInProgress = course.grade === 'IP' || course.grade === 'In Progress';

  return (
    <button
      type="button"
      onClick={() => editable && onEdit?.(course)}
      className={`group flex items-center justify-between rounded-lg border py-3 px-4 transition-all duration-200 ${
        editable ? 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]' : 'cursor-default'
      } ${
        isCompleted
          ? 'border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]'
          : isInProgress
            ? 'border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]'
            : 'border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--background)]'
      }`}
    >
      {/* Left side: Course code and title */}
      <div className="flex min-w-0 flex-col gap-0.5 text-left flex-1">
        <div className="flex items-center gap-2">
          <span className="font-body-semi text-sm font-bold text-[var(--foreground)]">
            {course.subject} {course.number}
          </span>
          {course.origin && course.origin !== 'parsed' && (
            <span className="text-[10px] font-semibold rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5">
              {course.origin === 'transfer' ? 'Transfer' : 'Manual'}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-[var(--muted-foreground)] font-body">
          {course.title}
        </span>
      </div>

      {/* Right side: Credits, grade, term */}
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        {showTerm && course.term && (
          <span className="text-[10px] font-semibold rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5 whitespace-nowrap font-body-semi">
            {course.term}
          </span>
        )}

        {course.credits && (
          <span className="text-xs font-body-semi text-[var(--muted-foreground)] whitespace-nowrap">
            {course.credits} cr
          </span>
        )}

        {course.grade && (
          <span
            className={`text-xs font-semibold whitespace-nowrap rounded-md px-2 py-1 font-body-semi ${
              isCompleted
                ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-[var(--foreground)]'
                : isInProgress
                  ? 'bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--foreground)]'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}
          >
            {course.grade}
          </span>
        )}
      </div>
    </button>
  );
}
