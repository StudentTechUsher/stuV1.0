'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Requirement } from './types';
import { CourseItem } from './CourseItem';
import { SubrequirementRow } from './SubrequirementRow';
import { getCompletedColor, getInProgressColor, getPlannedColor, getPlannedColorDark } from './colorUtils';

interface RequirementRowProps {
  requirement: Requirement;
  categoryColor: string;
  number: number;
}

export function RequirementRow({ requirement, categoryColor, number }: RequirementRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { title, description, progress, total, status, courses, subrequirements, completed, inProgress, planned } = requirement;

  // Determine if this requirement has subrequirements or direct courses
  const hasSubrequirements = subrequirements && subrequirements.length > 0;

  // Calculate percentages for segmented progress bar
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const plannedPercent = total > 0 ? (planned / total) * 100 : 0;

  // Determine number badge styling based on status
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in-progress';
  const isNotStarted = status === 'not-started';

  // Badge always shows the number, but background color indicates status
  const getBadgeBackground = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    return 'white';
  };

  const badgeClassName = isNotStarted
    ? 'text-black dark:text-white border-2 border-zinc-400 dark:border-zinc-500'
    : 'text-black';

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--border)_30%,transparent)] last:border-b-0">
      {/* Main requirement row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] transition-colors"
      >
        {/* Left: Number badge - ALWAYS shows the requirement number */}
        <div className="flex items-center gap-4 flex-1">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${badgeClassName}`}
            style={{ backgroundColor: getBadgeBackground() }}
          >
            {number}
          </div>

          {/* Middle: Text content */}
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-lg font-bold text-[var(--foreground)]">
              {title}
            </span>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {description}
            </span>
          </div>
        </div>

        {/* Right: Progress bar + Chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Inline segmented progress bar */}
          <div className="relative w-40 h-9 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-[color-mix(in_srgb,var(--border)_40%,transparent)] overflow-hidden">
            {/* Progress segments */}
            <div className="flex h-full">
              {/* Completed segment (solid color) */}
              {completedPercent > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    width: `${completedPercent}%`,
                    backgroundColor: getCompletedColor(categoryColor),
                  }}
                />
              )}

              {/* In Progress segment (50% transparent category color) */}
              {inProgressPercent > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    width: `${inProgressPercent}%`,
                    backgroundColor: getInProgressColor(categoryColor),
                  }}
                />
              )}

              {/* Planned segment (grey) */}
              {plannedPercent > 0 && (
                <div
                  className="transition-all duration-300 dark:hidden"
                  style={{
                    width: `${plannedPercent}%`,
                    backgroundColor: getPlannedColor(),
                  }}
                />
              )}
              {/* Planned segment (grey - dark mode) */}
              {plannedPercent > 0 && (
                <div
                  className="hidden transition-all duration-300 dark:block"
                  style={{
                    width: `${plannedPercent}%`,
                    backgroundColor: getPlannedColorDark(),
                  }}
                />
              )}
            </div>

            {/* Fraction text (always visible, centered) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-black dark:text-white relative z-10">
                {progress}/{total}
              </span>
            </div>
          </div>

          {/* Chevron icon */}
          <div className="flex items-center justify-center h-8 w-8">
            {isExpanded ? (
              <ChevronUp size={20} className="text-zinc-400" />
            ) : (
              <ChevronDown size={20} className="text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content - either subrequirements or courses */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-2 bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]">
          {hasSubrequirements ? (
            // Render subrequirements with numbered circles (1.1, 1.2, etc.)
            subrequirements!.map((subreq, index) => (
              <SubrequirementRow
                key={subreq.id}
                subrequirement={subreq}
                categoryColor={categoryColor}
                number={`${number}.${index + 1}`}
              />
            ))
          ) : (
            // Render courses directly as colored cards (no circles)
            courses?.map((course) => (
              <CourseItem
                key={course.id}
                course={course}
                categoryColor={categoryColor}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
