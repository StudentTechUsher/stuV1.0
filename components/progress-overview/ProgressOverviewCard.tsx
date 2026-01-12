'use client';

import React from 'react';
import type { ProgressOverviewCardProps } from './types';
import { RequirementRow } from './RequirementRow';
import { getCompletedColor, getInProgressColor, getPlannedColor, getPlannedColorDark } from './colorUtils';

export function ProgressOverviewCard({
  category,
  isExpandable = true,
  defaultExpanded = true,
}: ProgressOverviewCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const {
    name,
    color,
    totalCredits,
    percentComplete,
    completed,
    inProgress,
    planned,
    remaining,
    requirements,
  } = category;

  // Calculate background tint color
  const cardBackgroundStyle = {
    backgroundColor: `color-mix(in srgb, ${color} 8%, var(--background))`,
  };

  return (
    <div
      className="rounded-2xl p-10 shadow-sm"
      style={cardBackgroundStyle}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-black text-[var(--foreground)]">
          {name}
        </h2>
        <span className="text-xl font-semibold text-[var(--foreground)]">
          <span className="font-black">{totalCredits}</span> required credit hours
        </span>
      </div>

      {/* Main Progress Bar (THICK with text inside) - Segmented */}
      <div className="relative w-full h-20 rounded-2xl bg-white dark:bg-zinc-800 shadow-md mb-6 overflow-hidden">
        {/* Calculate segment percentages based on credits */}
        {(() => {
          const completedPercent = totalCredits > 0 ? (completed / totalCredits) * 100 : 0;
          const inProgressPercent = totalCredits > 0 ? (inProgress / totalCredits) * 100 : 0;
          const plannedPercent = totalCredits > 0 ? (planned / totalCredits) * 100 : 0;

          return (
            <div className="flex h-full">
              {/* Completed segment (solid color) */}
              {completedPercent > 0 && (
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${completedPercent}%`,
                    backgroundColor: getCompletedColor(color),
                  }}
                />
              )}

              {/* In Progress segment (50% transparent category color) */}
              {inProgressPercent > 0 && (
                <div
                  className="transition-all duration-500"
                  style={{
                    width: `${inProgressPercent}%`,
                    backgroundColor: getInProgressColor(color),
                  }}
                />
              )}

              {/* Planned segment (grey) */}
              {plannedPercent > 0 && (
                <div
                  className="transition-all duration-500 dark:hidden"
                  style={{
                    width: `${plannedPercent}%`,
                    backgroundColor: getPlannedColor(),
                  }}
                />
              )}
              {/* Planned segment (grey - dark mode) */}
              {plannedPercent > 0 && (
                <div
                  className="hidden transition-all duration-500 dark:block"
                  style={{
                    width: `${plannedPercent}%`,
                    backgroundColor: getPlannedColorDark(),
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* Percentage text INSIDE bar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black text-black relative z-10">
            {percentComplete} % complete
          </span>
        </div>
      </div>

      {/* Status Legend Row (Large circular badges) */}
      <div className="flex items-start gap-6 mb-8">
        {/* Completed badge - solid category color */}
        {completed > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md"
              style={{ backgroundColor: getCompletedColor(color) }}
            >
              <span className="text-xl font-bold text-black">{completed}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Completed</span>
          </div>
        )}

        {/* In Progress badge - 50% transparent category color */}
        {inProgress > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md"
              style={{ backgroundColor: getInProgressColor(color) }}
            >
              <span className="text-xl font-bold text-black dark:text-white">{inProgress}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">In Progress</span>
          </div>
        )}

        {/* Planned badge - grey */}
        {planned > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:hidden"
              style={{ backgroundColor: getPlannedColor() }}
            >
              <span className="text-xl font-bold text-black">{planned}</span>
            </div>
            <div
              className="hidden h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:flex"
              style={{ backgroundColor: getPlannedColorDark() }}
            >
              <span className="text-xl font-bold text-white">{planned}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Planned</span>
          </div>
        )}

        {/* Remaining badge */}
        {remaining > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-300 bg-white dark:bg-zinc-800 shadow-md">
              <span className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{remaining}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Remaining</span>
          </div>
        )}
      </div>

      {/* Requirements List */}
      {requirements.length > 0 && (
        <div className="flex flex-col">
          {requirements.map((req, index) => (
            <RequirementRow
              key={req.id}
              requirement={req}
              categoryColor={color}
              number={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
