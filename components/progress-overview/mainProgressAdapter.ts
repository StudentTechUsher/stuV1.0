/**
 * Adapter utilities to compute overall degree progress from category data
 * for the MainProgressOverview component.
 */

import type {
  ProgressCategory,
  OverallProgress,
  SectionProgress,
  MainProgressOverviewProps,
} from './types';

/**
 * Maps category names to display names for the MAIN overview
 */
function getDisplayName(name: string): string {
  const normalized = name.trim();
  const displayNameMap: Record<string, string> = {
    'General Education': 'Gen Ed',
    'Institutional Requirements': 'Institutional',
    'Electives': 'Electives',
  };

  return displayNameMap[normalized] || normalized;
}

/**
 * Counts total courses across all requirements in a category
 */
function countCoursesInCategory(category: ProgressCategory): {
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;

  for (const req of category.requirements) {
    if (req.subrequirements) {
      for (const subreq of req.subrequirements) {
        total += subreq.courses.length;
        completed += subreq.courses.filter((c) => c.status === 'completed').length;
      }
    } else if (req.courses) {
      total += req.courses.length;
      completed += req.courses.filter((c) => c.status === 'completed').length;
    }
  }

  return { total, completed };
}

/**
 * Computes main progress overview data from an array of ProgressCategory.
 * This aggregates all categories into a single overall progress view.
 *
 * @param categories - Array of ProgressCategory objects
 * @returns MainProgressOverviewProps with overall and section progress
 */
export function computeMainProgressData(
  categories: ProgressCategory[]
): MainProgressOverviewProps {
  // Aggregate overall stats
  let totalCredits = 0;
  let completedCredits = 0;
  let inProgressCredits = 0;
  let plannedCredits = 0;
  let remainingCredits = 0;
  let totalCourses = 0;
  let completedCourses = 0;

  // Build section progress array
  const sectionProgress: SectionProgress[] = [];

  for (const category of categories) {
    // Aggregate credits
    totalCredits += category.totalCredits;
    completedCredits += category.completed;
    inProgressCredits += category.inProgress;
    plannedCredits += category.planned;
    remainingCredits += category.remaining;

    // Count courses
    const courseCounts = countCoursesInCategory(category);
    totalCourses += courseCounts.total;
    completedCourses += courseCounts.completed;

    // Add section progress entry
    sectionProgress.push({
      name: category.name,
      displayName: getDisplayName(category.name),
      color: category.color,
      percentComplete: category.percentComplete,
      completedCredits: category.completed,
      totalCredits: category.totalCredits,
    });
  }

  // Calculate overall percentage
  const percentComplete =
    totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

  const overallProgress: OverallProgress = {
    percentComplete,
    totalCredits,
    completedCredits,
    inProgressCredits,
    plannedCredits,
    remainingCredits,
    totalCourses,
    completedCourses,
  };

  return {
    overallProgress,
    sectionProgress,
  };
}
