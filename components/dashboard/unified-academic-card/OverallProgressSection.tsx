'use client';

import { useState } from 'react';
import { ChevronDown, Info, GraduationCap, BookOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OVERALL_PROGRESS_MOCK, PLAN_DETAILS_MOCK } from './dashboardMockData';
import type { OverallProgress } from '@/components/progress-overview/types';
import {
  getCompletedColor,
  getInProgressColor,
  getPlannedColor,
  getPlannedColorDark,
} from '@/components/progress-overview/colorUtils';

/**
 * Optimization score thresholds for color coding
 * These determine what color the optimization indicator shows
 * Easy to adjust - just change these constants
 */
const OPTIMIZATION_THRESHOLDS = {
  RED_MAX: 40,      // < 40% = red (needs attention)
  ORANGE_MAX: 60,   // 40-59% = orange (could improve)
  YELLOW_MAX: 80,   // 60-79% = yellow (good)
  // >= 80% = green (excellent)
};

/**
 * Get the appropriate color for an optimization score
 * Uses theme-safe colors that work in light/dark mode
 */
function getOptimizationColor(score: number): {
  color: string;
  bgColor: string;
  label: string;
} {
  if (score < OPTIMIZATION_THRESHOLDS.RED_MAX) {
    return {
      color: 'rgb(220, 38, 38)', // red-600
      bgColor: 'rgb(254, 226, 226)', // red-100
      label: 'Needs Attention',
    };
  } else if (score < OPTIMIZATION_THRESHOLDS.ORANGE_MAX) {
    return {
      color: 'rgb(234, 88, 12)', // orange-600
      bgColor: 'rgb(255, 237, 213)', // orange-100
      label: 'Could Improve',
    };
  } else if (score < OPTIMIZATION_THRESHOLDS.YELLOW_MAX) {
    return {
      color: 'rgb(202, 138, 4)', // yellow-600
      bgColor: 'rgb(254, 249, 195)', // yellow-100
      label: 'Good',
    };
  } else {
    return {
      color: 'rgb(22, 163, 74)', // green-600
      bgColor: 'rgb(220, 252, 231)', // green-100
      label: 'Excellent',
    };
  }
}

/**
 * Large overall progress bar with expandable plan details
 * Shows degree completion progress as the main visual element
 * Expands to show Graduation Plan, Plan Follow Through, and Optimization
 */
// Primary color for degree progress bar
const DEGREE_COLOR = 'var(--degree-progress)';

export function OverallProgressSection({
  overallProgress,
}: {
  overallProgress?: OverallProgress;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const resolvedProgress = overallProgress
    ? {
        percentage: overallProgress.percentComplete,
        creditsCompleted: overallProgress.completedCredits,
        creditsInProgress: overallProgress.inProgressCredits,
        creditsPlanned: overallProgress.plannedCredits,
        totalCredits: overallProgress.totalCredits,
        coursesCompleted: overallProgress.completedCourses,
        coursesRemaining: Math.max(overallProgress.totalCourses - overallProgress.completedCourses, 0),
        tooltip: 'Based on your active graduation plan and completed coursework.',
      }
    : OVERALL_PROGRESS_MOCK;

  const {
    percentage,
    creditsCompleted,
    creditsInProgress,
    creditsPlanned,
    totalCredits,
    coursesCompleted,
    coursesRemaining,
    tooltip,
  } = resolvedProgress;
  const { graduationPlan, planFollowThrough, optimization } = PLAN_DETAILS_MOCK;

  // Calculate segment percentages for the progress bar
  const completedPercent = totalCredits > 0 ? (creditsCompleted / totalCredits) * 100 : 0;
  const inProgressPercent = totalCredits > 0 ? (creditsInProgress / totalCredits) * 100 : 0;
  const plannedPercent = totalCredits > 0 ? (creditsPlanned / totalCredits) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Title and Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-header-bold text-lg font-bold text-[var(--foreground)]">
            Overall Degree Progress
          </h3>
          <p className="font-body text-xs text-[var(--muted-foreground)]">
            Based on your active graduation plan
          </p>
        </div>
      </div>

      {/* Stats Row - Credits and Courses */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
            <GraduationCap size={14} className="text-emerald-600 dark:text-[var(--primary)]" />
          </div>
          <div>
            <span className="font-header-bold text-sm font-bold text-[var(--foreground)]">{creditsCompleted}</span>
            <span className="font-body text-xs text-[var(--muted-foreground)]"> / {totalCredits} credits</span>
          </div>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
            <BookOpen size={14} className="text-emerald-600 dark:text-[var(--primary)]" />
          </div>
          <div>
            <span className="font-header-bold text-sm font-bold text-[var(--foreground)]">{coursesCompleted}</span>
            <span className="font-body text-xs text-[var(--muted-foreground)]"> / {coursesCompleted + coursesRemaining} courses</span>
          </div>
        </div>
      </div>

      {/* Main Overall Progress Bar - Large & Prominent - Segmented Style */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full group cursor-pointer"
            >
              {/* Progress bar container - matches ProgressOverviewCard style */}
              <div className="relative w-full h-14 rounded-xl bg-white dark:bg-zinc-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* Segmented bar */}
                <div className="flex h-full">
                  {/* Completed segment (solid color) */}
                  {completedPercent > 0 && (
                    <div
                      className="transition-all duration-500"
                      style={{
                        width: `${completedPercent}%`,
                        backgroundColor: getCompletedColor(DEGREE_COLOR),
                      }}
                    />
                  )}

                  {/* In Progress segment (50% transparent) */}
                  {inProgressPercent > 0 && (
                    <div
                      className="transition-all duration-500"
                      style={{
                        width: `${inProgressPercent}%`,
                        backgroundColor: getInProgressColor(DEGREE_COLOR),
                      }}
                    />
                  )}

                  {/* Planned segment (grey - light mode) */}
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

                {/* Percentage text INSIDE bar - centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white dark:text-black relative z-10">
                    Degree {percentage}% Complete
                  </span>
                </div>

                {/* Expand indicator */}
                <div className="absolute right-3 inset-y-0 flex items-center">
                  <div className={`p-1 rounded-full bg-white/20 dark:bg-black/20 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} className="text-black dark:text-white" />
                  </div>
                </div>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Expandable Plan Details Section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-3 pt-2">
          {/* Graduation Plan Progress */}
          <ProgressDetailRow
            label={graduationPlan.label}
            percentage={graduationPlan.percentage}
            tooltip={graduationPlan.tooltip}
            color="var(--primary)"
          />

          {/* Plan Follow Through Progress */}
          <ProgressDetailRow
            label={planFollowThrough.label}
            percentage={planFollowThrough.percentage}
            tooltip={planFollowThrough.tooltip}
            color="#3B82F6"
          />

          {/* Optimization Progress (POC with color logic) */}
          <OptimizationRow
            label={optimization.label}
            percentage={optimization.percentage}
            tooltip={optimization.tooltip}
          />
        </div>
      </div>
    </div>
  );
}

interface ProgressDetailRowProps {
  label: string;
  percentage: number;
  tooltip: string;
  color: string;
}

function ProgressDetailRow({
  label,
  percentage,
  tooltip,
  color,
}: ProgressDetailRowProps) {
  return (
    <div className="rounded-xl p-4 bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
            {label}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="font-header-bold text-sm font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-600 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

interface OptimizationRowProps {
  label: string;
  percentage: number;
  tooltip: string;
}

/**
 * Optimization row with dynamic color based on score thresholds
 * Color changes: red < 40, orange 40-59, yellow 60-79, green >= 80
 */
function OptimizationRow({
  label,
  percentage,
  tooltip,
}: OptimizationRowProps) {
  const { color, label: statusLabel } = getOptimizationColor(percentage);

  return (
    <div className="rounded-xl p-4 border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
            {label}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
            Coming Soon
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              color: color,
            }}
          >
            {statusLabel}
          </span>
          <span className="font-header-bold text-sm font-bold" style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress bar with dynamic color */}
      <div className="relative w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-600 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out opacity-70"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Export thresholds for easy configuration/testing
 */
export { OPTIMIZATION_THRESHOLDS, getOptimizationColor };
