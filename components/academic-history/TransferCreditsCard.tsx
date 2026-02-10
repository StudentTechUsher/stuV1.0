'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ParsedCourse } from '@/lib/services/userCoursesService';
import { CourseRow } from './CourseRow';

interface TransferCreditsCardProps {
  courses: ParsedCourse[];
  defaultExpanded?: boolean;
  onEditCourse?: (course: ParsedCourse) => void;
  editable?: boolean;
}

/**
 * A collapsible card for displaying transfer, AP, IB, and other non-institutional credits.
 * Groups transfer courses together and allows expanding to see individual courses.
 * Styled to match Progress Overview design system.
 */
export function TransferCreditsCard({
  courses,
  defaultExpanded = false,
  onEditCourse,
  editable = true,
}: TransferCreditsCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const transferCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);
  const transferCourseCount = courses.length;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (transferCourseCount === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Header - Always visible, clickable to expand/collapse */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full bg-zinc-900 dark:bg-zinc-100 px-6 py-4 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-200 flex items-center justify-between gap-4"
      >
        <div className="flex flex-col items-start gap-1 text-left flex-1">
          <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
            Transfer Credits
          </h3>
          <p className="text-xs text-zinc-300 dark:text-zinc-700 font-body">
            Credits from other institutions and examinations
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-lg bg-[var(--primary)] px-3 py-1.5 font-body-semi text-xs font-semibold text-zinc-900">
              {transferCourseCount} {transferCourseCount !== 1 ? 'courses' : 'course'}
            </span>
            <span className="text-[10px] font-semibold text-zinc-300 dark:text-zinc-700 font-body-semi">
              {transferCredits} credits
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 space-y-2">
            {courses.length > 0 ? (
              courses.map((course) => (
                <CourseRow
                  key={course.id || `${course.subject}-${course.number}`}
                  course={course}
                  showTerm={true}
                  editable={editable}
                  onEdit={onEditCourse}
                />
              ))
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_5%,transparent)] p-4 text-center">
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  No transfer credits recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
