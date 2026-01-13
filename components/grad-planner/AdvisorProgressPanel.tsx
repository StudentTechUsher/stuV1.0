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
  expandableCategories?: ExpandableCategoryData[]; // Optional detailed category data for expansion
}

// === Helper Functions ===

/**
 * Extracts unique requirement categories from plan data
 * Groups them into: Programs, Gen Ed, Institution-Specific, Electives
 */
interface ExtractedCategories {
  programs: Set<string>;
  genEd: Set<string>;
  institutionSpecific: Set<string>;
  electives: Set<string>;
}

function extractCategories(planData: Term[]): ExtractedCategories {
  const categories: ExtractedCategories = {
    programs: new Set<string>(),
    genEd: new Set<string>(),
    institutionSpecific: new Set<string>(),
    electives: new Set<string>()
  };

  planData.forEach(term => {
    term.courses?.forEach(course => {
      course.fulfills?.forEach(fulfillment => {
        // Extract program name from "[Program Name] requirement-X" pattern
        const programMatch = fulfillment.match(/^\[(.+?)\]\s+requirement/);
        if (programMatch) {
          categories.programs.add(programMatch[1]);
          return;
        }

        // Categorize others
        const lower = fulfillment.toLowerCase();
        if (lower === 'elective') {
          categories.electives.add('Electives');
        } else if (
          lower.includes('religion') ||
          lower.includes('byu foundations') ||
          lower.includes('foundations for student success')
        ) {
          categories.institutionSpecific.add('Institutional Requirements');
        } else {
          // Everything else is Gen Ed (Arts/Letters/Sciences, Skills, etc.)
          categories.genEd.add('General Education');
        }
      });
    });
  });

  return categories;
}

/**
 * Gets a color for a program category based on its index
 * Cycles through a palette of distinct colors for multiple majors/minors
 */
function getProgramColor(index: number): string {
  const programColors = [
    'var(--primary)',     // Green - Primary major
    '#FF6B6B',            // Coral - Second major/minor
    '#4ECDC4',            // Teal - Third major/minor
    '#FFE66D',            // Yellow - Fourth (rare)
    '#95E1D3',            // Mint - Fifth (very rare)
  ];
  return programColors[index % programColors.length];
}

/**
 * Calculate category progress from plan data
 * This analyzes courses in the plan and categorizes them based on their fulfills[] array
 * Dynamically discovers categories instead of hardcoding them.
 *
 * Courses are classified as:
 * - Completed: courses with isCompleted: true OR in past terms (before the active term)
 * - In Progress: courses in the active term (is_active: true) that are not completed
 * - Planned: courses in future terms that are not completed
 */
export function calculateCategoryProgress(planData: Term[]): CategoryProgress[] {
  // First, extract all unique categories from the plan data
  const extractedCategories = extractCategories(planData);

  // Build a dynamic list of category names with their types
  const categoryDefinitions: Array<{ name: string; type: 'program' | 'genEd' | 'institutional' | 'elective'; colorIndex?: number }> = [];

  // Add programs
  Array.from(extractedCategories.programs).forEach((program, index) => {
    categoryDefinitions.push({ name: program, type: 'program', colorIndex: index });
  });

  // Add Gen Ed if present
  if (extractedCategories.genEd.size > 0) {
    categoryDefinitions.push({ name: 'General Education', type: 'genEd' });
  }

  // Add Institutional Requirements if present
  if (extractedCategories.institutionSpecific.size > 0) {
    categoryDefinitions.push({ name: 'Institutional Requirements', type: 'institutional' });
  }

  // Add Electives if present
  if (extractedCategories.electives.size > 0) {
    categoryDefinitions.push({ name: 'Electives', type: 'elective' });
  }

  // Initialize counters for each discovered category
  const categoryCounts: Record<string, { completed: number; inProgress: number; planned: number; total: number }> = {};
  categoryDefinitions.forEach(cat => {
    categoryCounts[cat.name] = { completed: 0, inProgress: 0, planned: 0, total: 0 };
  });

  // Find the index of the active term
  const activeTermIndex = planData.findIndex((term) => term.is_active === true);

  // Iterate through courses and count credits per category
  planData.forEach((term, termIndex) => {
    const courses = term.courses || [];
    const isActiveTerm = term.is_active === true;
    const isPastTerm = activeTermIndex !== -1 && termIndex < activeTermIndex;
    const isFutureTerm = activeTermIndex !== -1 && termIndex > activeTermIndex;

    courses.forEach((course) => {
      const credits = course.credits || 0;
      const fulfills = course.fulfills || [];

      // A course is considered completed if:
      // 1. It has isCompleted: true explicitly set, OR
      // 2. It's in a past term (before the active term)
      const isCompleted = course.isCompleted === true || isPastTerm;

      // Determine which category this course belongs to
      let categoryName = 'Electives'; // default

      for (const fulfillment of fulfills) {
        // Check for program match
        const programMatch = fulfillment.match(/^\[(.+?)\]\s+requirement/);
        if (programMatch) {
          categoryName = programMatch[1];
          break;
        }

        // Check for institutional requirements
        const lower = fulfillment.toLowerCase();
        if (
          lower.includes('religion') ||
          lower.includes('byu foundations') ||
          lower.includes('foundations for student success')
        ) {
          categoryName = 'Institutional Requirements';
          break;
        }

        // Check for electives
        if (lower === 'elective') {
          categoryName = 'Electives';
          break;
        }

        // Everything else is Gen Ed
        categoryName = 'General Education';
        break;
      }

      // Only count if this category exists in our discovered categories
      if (categoryCounts[categoryName]) {
        // Classify credits based on course and term status
        if (isCompleted) {
          categoryCounts[categoryName].completed += credits;
        } else if (isActiveTerm) {
          categoryCounts[categoryName].inProgress += credits;
        } else if (isFutureTerm || activeTermIndex === -1) {
          categoryCounts[categoryName].planned += credits;
        }

        categoryCounts[categoryName].total += credits;
      }
    });
  });

  // Define colors by category type
  const categoryColors: Record<string, string> = {
    'General Education': '#2196f3', // Blue
    'Institutional Requirements': '#5E35B1', // Indigo
    'Electives': '#9C27B0', // Magenta
  };

  // Map to CategoryProgress format with colors
  const progressData = categoryDefinitions
    .map(catDef => {
      const counts = categoryCounts[catDef.name];

      // Determine color based on type
      let color: string;
      if (catDef.type === 'program') {
        color = getProgramColor(catDef.colorIndex || 0);
      } else {
        color = categoryColors[catDef.name] || '#71717a';
      }

      return {
        category: catDef.name,
        completed: counts.completed,
        inProgress: counts.inProgress,
        planned: counts.planned,
        remaining: 0, // calculated as total - (completed + inProgress + planned)
        total: counts.total,
        color,
      };
    })
    // Filter out categories with 0 total credits
    .filter(cat => cat.total > 0);

  return progressData;
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

  // Show percentage of completed credits out of total credits for this category
  const overallPercent = Math.round(completedPercent);

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
              {/* Credits completed badge */}
              <div className="inline-flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.18)_40%,transparent)] bg-[#0a1f1a] px-4 py-2 shadow-[0_28px_70px_-50px_rgba(10,31,26,0.65)]">
                <span className="text-sm font-semibold tracking-wide text-white">
                  {totalCredits.earned.toFixed(2)} / {totalCredits.required.toFixed(2)}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color-mix(in_srgb,white_70%,transparent)]">
                  Credits Completed
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
