'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Subrequirement } from './types';
import { CourseItem } from './CourseItem';
import { getCompletedColor, getInProgressColor, getPlannedColor, getPlannedColorDark } from './colorUtils';

interface SubrequirementRowProps {
  subrequirement: Subrequirement;
  categoryColor: string;
  number: string; // e.g., "1.1", "1.2"
}

export function SubrequirementRow({ subrequirement, categoryColor, number }: SubrequirementRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { title, description, progress, total, status, courses, completed, inProgress, planned } = subrequirement;

  // Calculate percentages for segmented progress bar
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const plannedPercent = total > 0 ? (planned / total) * 100 : 0;

  // Badge styling based on status
  const getBadgeBackground = () => {
    if (status === 'completed') return getCompletedColor(categoryColor);
    if (status === 'in-progress') return getInProgressColor(categoryColor);
    return 'white';
  };

  const badgeClassName = status === 'not-started'
    ? 'text-black dark:text-white border-2 border-zinc-400 dark:border-zinc-500'
    : 'text-black';

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--border)_20%,transparent)] last:border-b-0">
      {/* Subrequirement row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 px-2 hover:bg-[color-mix(in_srgb,var(--muted)_10%,transparent)] transition-colors rounded-lg"
      >
        {/* Left: Number badge */}
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${badgeClassName}`}
            style={{ backgroundColor: getBadgeBackground() }}
          >
            {number}
          </div>

          {/* Middle: Text content */}
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-base font-bold text-[var(--foreground)]">
              {title}
            </span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {description}
            </span>
          </div>
        </div>

        {/* Right: Progress bar + Chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Inline segmented progress bar */}
          <div className="relative w-32 h-8 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-[color-mix(in_srgb,var(--border)_40%,transparent)] overflow-hidden">
            {/* Progress segments */}
            <div className="flex h-full">
              {/* Completed segment */}
              {completedPercent > 0 && (
                <div
                  className="transition-all duration-300"
                  style={{
                    width: `${completedPercent}%`,
                    backgroundColor: getCompletedColor(categoryColor),
                  }}
                />
              )}

              {/* In Progress segment */}
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

            {/* Fraction text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-black dark:text-white relative z-10">
                {progress}/{total}
              </span>
            </div>
          </div>

          {/* Chevron icon */}
          <div className="flex items-center justify-center h-6 w-6">
            {isExpanded ? (
              <ChevronUp size={16} className="text-zinc-400" />
            ) : (
              <ChevronDown size={16} className="text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded course list */}
      {isExpanded && (
        <div className="pl-14 pr-4 pb-3 pt-1 space-y-2">
          {courses.map((course) => (
            <CourseItem
              key={course.id}
              course={course}
              categoryColor={categoryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
