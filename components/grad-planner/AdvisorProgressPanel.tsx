'use client';

import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Term } from './types';
import type { ExpandableCategoryData } from './ExpandableProgressCategory';
import { ProgressOverviewCard } from '../progress-overview/ProgressOverviewCard';
import { CategoryTabs } from '../progress-overview/CategoryTabs';
import { convertCategoriesToProgressCategories } from '../progress-overview/dataAdapter';
import type { ProgressCategory } from '../progress-overview/types';

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
 * Courses are classified as:
 * - Completed: courses with isCompleted: true OR in past terms (before the active term)
 * - In Progress: courses in the active term (is_active: true) that are not completed
 * - Planned: courses in future terms that are not completed
 */
export function calculateCategoryProgress(planData: Term[]): CategoryProgress[] {
  const categoryCounts: Record<string, { completed: number; inProgress: number; planned: number; total: number }> = {
    'Major': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'General Education': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'Religion': { completed: 0, inProgress: 0, planned: 0, total: 0 },
    'Electives': { completed: 0, inProgress: 0, planned: 0, total: 0 },
  };

  // Find the index of the active term
  const activeTermIndex = planData.findIndex((term) => term.is_active === true);

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

      // Categorize based on fulfills array
      let category = 'Electives'; // default

      if (fulfills.length > 0) {
        const fulfillsStr = fulfills.join(' ').toLowerCase();

        // Major: courses with program names in brackets (e.g., "[Information Systems (BSIS)] requirement-3")
        // This pattern works for any program at any institution
        if (fulfills.some(f => f.match(/\[.*?\]/))) {
          category = 'Major';
        }
        // Religion: courses that fulfill religion requirements
        // Looks for "religion" keyword which is common across institutions
        else if (fulfillsStr.includes('religion')) {
          category = 'Religion';
        }
        // General Education: GE requirements (catch-all for various GE patterns)
        // This includes: Arts/Letters/Sciences, Skills, Civilization, American Heritage, Global, Foundations
        else if (
          fulfillsStr.includes('arts') ||
          fulfillsStr.includes('letters') ||
          fulfillsStr.includes('sciences') ||
          fulfillsStr.includes('skills') ||
          fulfillsStr.includes('civilization') ||
          fulfillsStr.includes('american heritage') ||
          fulfillsStr.includes('global') ||
          fulfillsStr.includes('foundations') ||
          fulfillsStr.includes('gen ed') ||
          fulfillsStr.includes('general education')
        ) {
          category = 'General Education';
        }
        // Elective: explicitly marked or anything else not categorized above
        // No need for explicit check - it's the default
      }

      // Classify credits based on course and term status
      if (isCompleted) {
        categoryCounts[category].completed += credits;
      } else if (isActiveTerm) {
        categoryCounts[category].inProgress += credits;
      } else if (isFutureTerm || activeTermIndex === -1) {
        categoryCounts[category].planned += credits;
      }

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

  // Convert categories to new format for ProgressOverviewCard
  const progressCategories: ProgressCategory[] = React.useMemo(
    () => convertCategoriesToProgressCategories(categories, expandableCategories),
    [categories, expandableCategories]
  );

  // Track selected category for new tabs navigation
  const [selectedCategoryName, setSelectedCategoryName] = React.useState<string>(
    categories.length > 0 ? categories[0].category : 'Major'
  );

  // Get the selected category data
  const selectedCategoryData = React.useMemo(() => {
    return progressCategories.find((cat) => cat.name === selectedCategoryName);
  }, [progressCategories, selectedCategoryName]);

  const CollapseIcon = isCollapsed ? ChevronLeft : ChevronRight;

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

          {/* Category Navigation Tabs */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
              By Category
            </h4>

            <CategoryTabs
              categories={progressCategories}
              selectedCategory={selectedCategoryName}
              onSelectCategory={setSelectedCategoryName}
            />
          </div>

          {/* Selected Category Details */}
          {selectedCategoryData && (
            <div className="overflow-hidden rounded-xl">
              <ProgressOverviewCard
                category={selectedCategoryData}
                isExpandable={true}
                defaultExpanded={true}
                compact={true}
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
}
