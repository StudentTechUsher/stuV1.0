'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ParsedCourse } from '@/lib/services/userCoursesService';
import { CourseRow } from './CourseRow';

interface SemesterCardProps {
  term: string;
  courses: ParsedCourse[];
  metrics?: {
    hoursEarned: number;
    hoursGraded: number;
    gpa: number;
  };
  defaultExpanded?: boolean;
  onEditCourse?: (course: ParsedCourse) => void;
  editable?: boolean;
}

/**
 * A collapsible semester/term card showing courses for that term.
 * Displays term metrics in the header and expands to show a list of courses.
 * Styled to match Progress Overview design system.
 */
export function SemesterCard({
  term,
  courses,
  metrics,
  defaultExpanded = false,
  onEditCourse,
  editable = true,
}: SemesterCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const termCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
            {term}
          </h3>
          {metrics && (
            <div className="flex gap-4 text-xs text-zinc-300 dark:text-zinc-700 font-body">
              <span>{metrics.hoursEarned} credits earned</span>
              {metrics.hoursGraded > 0 && <span>•</span>}
              {metrics.hoursGraded > 0 && (
                <>
                  <span>{metrics.hoursGraded} credits graded</span>
                  <span>•</span>
                  <span>{metrics.gpa.toFixed(2)} GPA</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="rounded-lg bg-[var(--primary)] px-3 py-1.5 font-body-semi text-xs font-semibold text-zinc-900">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </span>
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
                  key={course.id || `${course.subject}-${course.number}-${course.term}`}
                  course={course}
                  showTerm={false}
                  editable={editable}
                  onEdit={onEditCourse}
                />
              ))
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_5%,transparent)] p-4 text-center">
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  No courses recorded for this term.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
