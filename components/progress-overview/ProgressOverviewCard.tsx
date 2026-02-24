'use client';

import React from 'react';
import type { ProgressOverviewCardProps } from './types';
import { RequirementRow } from './RequirementRow';
import { getCompletedColor, getInProgressColor, getPlannedColor, getPlannedColorDark } from './colorUtils';

export function ProgressOverviewCard({
  category,
  isExpandable: _isExpandable = true,
  defaultExpanded: _defaultExpanded = true,
  compact = false,
  expandSignal,
}: ProgressOverviewCardProps) {

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
      className={compact ? "rounded-xl p-6 shadow-sm" : "rounded-2xl p-10 shadow-sm"}
      style={cardBackgroundStyle}
    >
      {/* Header Row */}
      <div className={compact ? "flex items-center justify-between mb-4" : "flex items-center justify-between mb-6"}>
        <h2 className={compact ? "text-2xl font-black text-[var(--foreground)]" : "text-4xl font-black text-[var(--foreground)]"}>
          {name}
        </h2>
        <span className={compact ? "text-sm font-semibold text-[var(--foreground)]" : "text-xl font-semibold text-[var(--foreground)]"}>
          <span className="font-black">{totalCredits}</span> {compact ? "cr" : "required credit hours"}
        </span>
      </div>

      {/* Main Progress Bar (THICK with text inside) - Segmented */}
      <div className={compact
        ? "relative w-full h-14 rounded-xl bg-white dark:bg-zinc-800 shadow-sm mb-4 overflow-hidden"
        : "relative w-full h-20 rounded-2xl bg-white dark:bg-zinc-800 shadow-md mb-6 overflow-hidden"
      }>
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
          <span className={compact ? "text-lg font-black text-black dark:text-white relative z-10" : "text-2xl font-black text-black relative z-10"}>
            {percentComplete} % complete
          </span>
        </div>
      </div>

      {/* Status Legend Row (Large circular badges) */}
      <div className={compact ? "flex items-start gap-4 mb-6" : "flex items-start gap-6 mb-8"}>
        {/* Completed badge - solid category color */}
        {completed > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={compact ? "flex h-12 w-12 items-center justify-center rounded-full border-2 border-transparent shadow-md" : "flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md"}
              style={{ backgroundColor: getCompletedColor(color) }}
            >
              <span className={compact ? "text-lg font-bold text-black" : "text-xl font-bold text-black"}>{completed}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Completed</span>
          </div>
        )}

        {/* In Progress badge - 50% transparent category color */}
        {inProgress > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={compact ? "flex h-12 w-12 items-center justify-center rounded-full border-2 border-transparent shadow-md" : "flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md"}
              style={{ backgroundColor: getInProgressColor(color) }}
            >
              <span className={compact ? "text-lg font-bold text-black dark:text-white" : "text-xl font-bold text-black dark:text-white"}>{inProgress}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">In Progress</span>
          </div>
        )}

        {/* Planned badge - grey */}
        {planned > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div
              className={compact ? "flex h-12 w-12 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:hidden" : "flex h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:hidden"}
              style={{ backgroundColor: getPlannedColor() }}
            >
              <span className={compact ? "text-lg font-bold text-black" : "text-xl font-bold text-black"}>{planned}</span>
            </div>
            <div
              className={compact ? "hidden h-12 w-12 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:flex" : "hidden h-14 w-14 items-center justify-center rounded-full border-2 border-transparent shadow-md dark:flex"}
              style={{ backgroundColor: getPlannedColorDark() }}
            >
              <span className={compact ? "text-lg font-bold text-white" : "text-xl font-bold text-white"}>{planned}</span>
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">Planned</span>
          </div>
        )}

        {/* Remaining badge */}
        {remaining > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className={compact ? "flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-300 bg-white dark:bg-zinc-800 shadow-md" : "flex h-14 w-14 items-center justify-center rounded-full border-2 border-zinc-300 bg-white dark:bg-zinc-800 shadow-md"}>
              <span className={compact ? "text-lg font-bold text-zinc-600 dark:text-zinc-400" : "text-xl font-bold text-zinc-600 dark:text-zinc-400"}>{remaining}</span>
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
              expandSignal={expandSignal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
