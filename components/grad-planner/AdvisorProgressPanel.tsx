'use client';

import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Term } from './types';
import type { ExpandableCategoryData } from './ExpandableProgressCategory';
import { RequirementGroup } from './ExpandableProgressCategory';

// === Type Definitions ===

export interface CategoryProgress {
  category: string;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  total: number;
  color: string;
}

export interface AdvisorProgressPanelProps {
  studentName: string;
  totalCredits: { earned: number; required: number };
  categories: CategoryProgress[];
  planData?: Term[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentSemesterCredits?: number; // Credits student is currently taking
  plannedCredits?: number; // Total credits planned in the grad plan
  expandableCategories?: ExpandableCategoryData[]; // Optional detailed category data for expansion
}

// === Helper Functions ===

/**
 * Calculate category progress from plan data
 * This analyzes courses in the plan and categorizes them based on their fulfills[] array
 */
export function calculateCategoryProgress(planData: Term[]): CategoryProgress[] {
  const categoryCounts: Record<string, { completed: number; inProgress: number; planned: number; total: number }> = {
    'Major': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'General Education': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'Religion': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'Electives': { completed: 0, inProgress: 0, planned: 0, total: 0 },
  };

  planData.forEach((term) => {
    const courses = term.courses || [];
    courses.forEach((course) => {
      const credits = course.credits || 0;
      const fulfills = course.fulfills || [];

      // Categorize based on fulfills array
      let category = 'Electives'; // default

      if (fulfills.some(f => f.toLowerCase().includes('major'))) {
        category = 'Major';
      } else if (fulfills.some(f => f.toLowerCase().includes('gen ed') || f.toLowerCase().includes('global & cultural') || f.toLowerCase().includes('american heritage'))) {
        category = 'General Education';
      } else if (fulfills.some(f => f.toLowerCase().includes('religion') || f.toLowerCase().includes('rel '))) {
        category = 'Religion';
      }

      // For demo purposes, assume completed if in past terms (you'd check against current date in production)
      categoryCounts[category].completed += credits;
      categoryCounts[category].total += credits;
    });
  });

  // Map to CategoryProgress format
  // Colors match semester-results-table.tsx for consistency
  const categoryColors: Record<string, string> = {
    'Major': 'var(--primary)', // Green
    'General Education': '#2196f3', // Blue
    'Religion': '#5E35B1', // Indigo
    'Electives': '#9C27B0', // Magenta
  };

  return Object.entries(categoryCounts).map(([category, counts]) => ({
    category,
    completed: counts.completed,
    inProgress: counts.inProgress,
    planned: counts.planned,
    remaining: 0, // calculated as total - (completed + inProgress + planned)
    total: counts.total,
    color: categoryColors[category] || '#71717a',
  }));
}

// === Sub-Components ===

interface CategoryProgressBarProps {
  category: CategoryProgress;
  onClick?: () => void;
  isClickable?: boolean;
}

function CategoryProgressBar({ category, onClick, isClickable = false }: CategoryProgressBarProps) {
  const { category: name, completed, inProgress, planned, remaining, total, color } = category;

  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const plannedPercent = total > 0 ? (planned / total) * 100 : 0;

  const overallPercent = Math.round(total > 0 ? ((completed + inProgress + planned) / total) * 100 : 0);

  const Container = isClickable ? 'button' : 'div';
  const containerProps = isClickable
    ? {
        type: 'button' as const,
        onClick,
        className: 'flex w-full cursor-pointer flex-col gap-3 rounded-lg border border-transparent p-3 text-left transition-all hover:border-[color-mix(in_srgb,var(--border)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        style: { outlineColor: color },
      }
    : { className: 'flex flex-col gap-3' };

  return (
    <Container {...containerProps}>
      {/* Category Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]">
            {name}
          </span>
        </div>
        <span className="text-xs font-semibold tracking-wide text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
          {overallPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
        <div className="flex h-full">
          {/* Completed segment */}
          {completedPercent > 0 && (
            <div
              className="transition-all duration-300"
              style={{
                width: `${completedPercent}%`,
                backgroundColor: color,
              }}
              role="progressbar"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`${name} completed: ${completed} of ${total} credits`}
            />
          )}

          {/* In Progress segment */}
          {inProgressPercent > 0 && (
            <div
              className="transition-all duration-300"
              style={{
                width: `${inProgressPercent}%`,
                backgroundColor: color,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)',
              }}
              role="progressbar"
              aria-valuenow={inProgress}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`${name} in progress: ${inProgress} of ${total} credits`}
            />
          )}

          {/* Planned segment */}
          {plannedPercent > 0 && (
            <div
              className="transition-all duration-300"
              style={{
                width: `${plannedPercent}%`,
                backgroundColor: `color-mix(in srgb, ${color} 35%, transparent)`,
              }}
              role="progressbar"
              aria-valuenow={planned}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`${name} planned: ${planned} of ${total} credits`}
            />
          )}
        </div>
      </div>

      {/* Credit Details */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
          {completed.toFixed(2)} / {total.toFixed(2)} credits
        </span>

        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          {completed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_38%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]">
              ✓ {completed.toFixed(1)}
            </span>
          )}
          {inProgress > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--action-edit)_42%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_82%,var(--action-edit)_18%)]">
              ⟳ {inProgress.toFixed(1)}
            </span>
          )}
          {planned > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_36%,transparent)] bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_78%,var(--muted-foreground)_22%)]">
              ◌ {planned.toFixed(1)}
            </span>
          )}
          {remaining > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_32%,transparent)] bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--muted-foreground)_75%,var(--foreground)_25%)]">
              − {remaining.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Container>
  );
}

// === Main Component ===

export function AdvisorProgressPanel({
  studentName,
  totalCredits,
  categories,
  isCollapsed = false,
  onToggleCollapse,
  currentSemesterCredits = 0,
  plannedCredits = 0,
  expandableCategories,
}: AdvisorProgressPanelProps) {
  const totalPercent = totalCredits.required > 0
    ? Math.round((totalCredits.earned / totalCredits.required) * 100)
    : 0;

  // Track which category is expanded (for click-to-expand on simple bars)
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  const CollapseIcon = isCollapsed ? ChevronLeft : ChevronRight;

  // Handle category click - toggle expanded state
  const handleCategoryClick = (categoryName: string) => {
    setExpandedCategory(prev => prev === categoryName ? null : categoryName);
  };

  return (
    <aside
      className={cn(
        'sticky top-6 flex h-fit flex-col gap-6 rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.16)_30%,var(--border)_70%)] bg-white p-6 shadow-[0_42px_120px_-68px_rgba(8,35,24,0.55)] transition-all duration-300',
        isCollapsed && 'max-w-[60px] overflow-hidden p-4'
      )}
      aria-label="Student Progress Overview"
    >
      {/* Header with collapse toggle */}
      <div className="flex items-start justify-between gap-3">
        {!isCollapsed && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
              Progress Overview
            </span>
            <h3 className="font-header text-lg font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
              {studentName}
            </h3>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)] transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_30%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_88%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            aria-label={isCollapsed ? 'Expand progress panel' : 'Collapse progress panel'}
          >
            <CollapseIcon size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Collapsed state - show minimal info */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-[color-mix(in_srgb,var(--primary)_80%,var(--foreground)_20%)]">
            {totalPercent}%
          </span>
        </div>
      )}

      {/* Expanded state - full details */}
      {!isCollapsed && (
        <>
          {/* Overall Progress */}
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
                Graduation Progress
              </span>
              <span className="text-2xl font-bold tracking-tight text-[color-mix(in_srgb,var(--primary)_82%,var(--foreground)_18%)]">
                {totalPercent}%
              </span>
            </div>

            {/* Overall progress bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] transition-all duration-500"
                style={{ width: `${totalPercent}%` }}
                role="progressbar"
                aria-valuenow={totalCredits.earned}
                aria-valuemin={0}
                aria-valuemax={totalCredits.required}
                aria-label={`Overall graduation progress: ${totalCredits.earned} of ${totalCredits.required} credits completed`}
              />
            </div>

            {/* Credit badges */}
            <div className="flex flex-col gap-2">
              {/* Total credits badge */}
              <div className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.18)_40%,transparent)] bg-[#0a1f1a] px-4 py-2 shadow-[0_28px_70px_-50px_rgba(10,31,26,0.65)]">
                <span className="text-sm font-semibold tracking-wide text-white">
                  {totalCredits.earned.toFixed(2)} / {totalCredits.required.toFixed(2)}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color-mix(in_srgb,white_70%,transparent)]">
                  Total Credits
                </span>
              </div>

              {/* Current semester credits badge */}
              {currentSemesterCredits > 0 && (
                <div className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--action-edit)_42%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_14%,white)] px-4 py-2 shadow-[0_18px_50px_-40px_rgba(253,204,74,0.45)]">
                  <span className="text-sm font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_88%,var(--action-edit)_12%)]">
                    {currentSemesterCredits.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--foreground)_68%,var(--action-edit)_32%)]">
                    Current Semester
                  </span>
                </div>
              )}

              {/* Planned credits badge */}
              {plannedCredits > 0 && (
                <div className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,white)] px-4 py-2 shadow-[0_18px_50px_-40px_rgba(18,249,135,0.45)]">
                  <span className="text-sm font-semibold tracking-wide text-[color-mix(in_srgb,var(--foreground)_88%,var(--primary)_12%)]">
                    {plannedCredits.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--foreground)_68%,var(--primary)_32%)]">
                    Planned in Grad Plan
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[color-mix(in_srgb,var(--border)_60%,transparent)]" aria-hidden="true" />

          {/* Category Breakdown */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
              By Category
            </h4>

            <div className="flex flex-col gap-5">
              {categories.map((category) => {
                const isExpanded = expandedCategory === category.category;
                const expandableData = expandableCategories?.find(
                  (ec) => ec.name === category.category
                );

                return (
                  <div key={category.category} className="flex flex-col gap-3">
                    {/* Simple progress bar - clickable if expandable data exists */}
                    <CategoryProgressBar
                      category={category}
                      isClickable={!!expandableData}
                      onClick={() => expandableData && handleCategoryClick(category.category)}
                    />

                    {/* Show expandable details if clicked and data exists */}
                    {isExpanded && expandableData && (
                      <div className="overflow-hidden">
                        <div
                          className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--border)_60%,transparent)] p-4 animate-in fade-in slide-in-from-top-2 duration-300"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${category.color} 4%, white)`
                          }}
                        >
                          {expandableData.requirements.length > 0 ? (
                            expandableData.requirements.map((requirement, index) => (
                              <RequirementGroup
                                key={requirement.id}
                                requirement={requirement}
                                requirementNumber={index + 1}
                                categoryColor={category.color}
                              />
                            ))
                          ) : (
                            <p className="text-sm text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                              No requirements defined for this category yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary legend */}
          <div className="flex flex-col gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--muted-foreground)_28%,transparent)] bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
              Legend
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[color-mix(in_srgb,var(--primary)_85%,var(--foreground)_15%)]">✓</span>
                <span className="text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[color-mix(in_srgb,var(--action-edit)_85%,var(--foreground)_15%)]">⟳</span>
                <span className="text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[color-mix(in_srgb,var(--muted-foreground)_75%,transparent)]">◌</span>
                <span className="text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[color-mix(in_srgb,var(--muted-foreground)_75%,transparent)]">−</span>
                <span className="text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">Remaining</span>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
