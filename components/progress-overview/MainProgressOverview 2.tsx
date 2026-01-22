'use client';

import React from 'react';
import type { MainProgressOverviewProps } from './types';

/**
 * MainProgressOverview - Top-level "MAIN" overview section showing:
 * 1. Overall degree progress bar (black/grey/white theme)
 * 2. Section progress bars for each category (Major, GE, REL, etc.)
 */
export function MainProgressOverview({
  overallProgress,
  sectionProgress,
  onSectionClick,
}: MainProgressOverviewProps) {
  const {
    percentComplete,
    totalCredits,
    completedCredits,
    inProgressCredits,
    plannedCredits,
    remainingCredits,
    totalCourses,
    completedCourses,
  } = overallProgress;

  // Calculate segment widths for the overall bar
  const completedPercent = totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0;
  const inProgressPercent = totalCredits > 0 ? (inProgressCredits / totalCredits) * 100 : 0;
  const plannedPercent = totalCredits > 0 ? (plannedCredits / totalCredits) * 100 : 0;

  return (
    <div className="w-full">
      {/* Overall Degree Progress Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-[var(--foreground)] mb-4">
          Overall Degree Progress
        </h2>

        {/* Main Progress Bar - Black/Grey/White Theme */}
        <div className="relative w-full h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700 shadow-md overflow-hidden mb-4">
          {/* Segmented fill */}
          <div className="flex h-full">
            {/* Completed segment - solid dark */}
            {completedPercent > 0 && (
              <div
                className="transition-all duration-500 bg-[var(--degree-progress)]"
                style={{ width: `${completedPercent}%` }}
              />
            )}

            {/* In Progress segment - medium grey */}
            {inProgressPercent > 0 && (
              <div
                className="transition-all duration-500 bg-zinc-400 dark:bg-zinc-500"
                style={{ width: `${inProgressPercent}%` }}
              />
            )}

            {/* Planned segment - light grey */}
            {plannedPercent > 0 && (
              <div
                className="transition-all duration-500 bg-zinc-300 dark:bg-zinc-600"
                style={{ width: `${plannedPercent}%` }}
              />
            )}
          </div>

          {/* Percentage text inside bar */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white dark:text-zinc-900 drop-shadow-sm">
              {percentComplete}% complete
            </span>
          </div>
        </div>

        {/* Supporting Stats Row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-[var(--degree-progress)]" />
            <span>
              <span className="font-bold text-[var(--foreground)]">{completedCredits}</span> / {totalCredits} credits
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span>
              <span className="font-bold text-[var(--foreground)]">{inProgressCredits}</span> in progress
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span>
              <span className="font-bold text-[var(--foreground)]">{plannedCredits}</span> planned
            </span>
          </div>
          {remainingCredits > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-transparent" />
              <span>
                <span className="font-bold text-[var(--foreground)]">{remainingCredits}</span> remaining
              </span>
            </div>
          )}
          <div className="ml-auto text-right">
            <span className="font-semibold text-[var(--foreground)]">{completedCourses}</span>
            <span className="text-[var(--muted-foreground)]"> / {totalCourses} courses</span>
          </div>
        </div>
      </div>

      {/* Section Progress Grid */}
      <div>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">
          Progress by Section
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionProgress.map((section) => (
            <SectionProgressCard
              key={section.name}
              section={section}
              onClick={onSectionClick ? () => onSectionClick(section.name) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual section progress card
 */
function SectionProgressCard({
  section,
  onClick,
}: {
  section: MainProgressOverviewProps['sectionProgress'][number];
  onClick?: () => void;
}) {
  const { displayName, color, percentComplete, completedCredits, totalCredits } = section;
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`rounded-xl p-4 shadow-sm text-left w-full transition-all duration-200 ${
        isClickable
          ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99]'
          : 'cursor-default'
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, var(--background))`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
          {displayName}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {percentComplete}%
          </span>
          {isClickable && (
            <svg
              className="w-4 h-4 text-[var(--muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-8 rounded-lg bg-white dark:bg-zinc-800 shadow-sm overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg"
          style={{
            width: `${percentComplete}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Credits label */}
      <div className="text-xs text-[var(--muted-foreground)]">
        <span className="font-semibold text-[var(--foreground)]">{completedCredits}</span>
        <span> / {totalCredits} credits</span>
      </div>
    </button>
  );
}
