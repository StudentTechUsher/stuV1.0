/**
 * Data adapter utilities to convert between old CategoryProgress format
 * and new ProgressCategory format for the Progress Overview components
 */

import type { ProgressCategory, Requirement } from './types';
import type { CategoryProgress } from '../grad-planner/AdvisorProgressPanel';
import type { ExpandableCategoryData } from '../grad-planner/ExpandableProgressCategory';

/**
 * Convert CategoryProgress (old format) to ProgressCategory (new format)
 * This allows the new ProgressOverviewCard to work with existing data
 */
export function convertCategoryProgressToProgressCategory(
  categoryProgress: CategoryProgress,
  expandableData?: ExpandableCategoryData
): ProgressCategory {
  const percentComplete = categoryProgress.total > 0
    ? Math.round((categoryProgress.completed / categoryProgress.total) * 100)
    : 0;

  // Convert expandable requirements to new format if available
  const requirements: Requirement[] = expandableData?.requirements.map((req, index) => ({
    id: index + 1,
    title: req.title,
    description: req.description,
    progress: req.progress,
    total: req.total,
    status: getRequirementStatus(req.progress, req.total),
    completed: req.progress,
    inProgress: 0, // TODO: Calculate from courses if available
    planned: 0, // TODO: Calculate from courses if available
    remaining: Math.max(0, req.total - req.progress),
    courses: req.courses?.map((course, courseIndex) => ({
      id: `${index}-${courseIndex}`,
      code: course.code || 'UNKN 000',
      title: course.title || 'Unknown Course',
      credits: course.credits || 0,
      status: course.status,
    })) || [],
  })) || [];

  return {
    name: categoryProgress.category,
    color: categoryProgress.color,
    totalCredits: categoryProgress.total,
    percentComplete,
    completed: categoryProgress.completed,
    inProgress: categoryProgress.inProgress,
    planned: categoryProgress.planned,
    remaining: categoryProgress.remaining,
    requirements,
  };
}

/**
 * Helper to determine requirement status based on completion
 */
function getRequirementStatus(completed: number, required: number): 'completed' | 'in-progress' | 'not-started' {
  if (completed >= required) return 'completed';
  if (completed > 0) return 'in-progress';
  return 'not-started';
}

/**
 * Convert multiple CategoryProgress items to ProgressCategory array
 */
export function convertCategoriesToProgressCategories(
  categories: CategoryProgress[],
  expandableCategories?: ExpandableCategoryData[]
): ProgressCategory[] {
  return categories.map((category) => {
    const expandableData = expandableCategories?.find(
      (ec) => ec.name === category.category
    );
    return convertCategoryProgressToProgressCategory(category, expandableData);
  });
}
