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
        } else {
          // Treat institutional/religion fulfillments as Gen Ed for overview grouping.
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
