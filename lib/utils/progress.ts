/**
 * Progress Calculation Utilities
 * Handles totals, percentages, and status mapping for program progress
 */

import type {
  CategoryProgress,
  Requirement,
  SubRequirement,
  CourseRef,
  CourseStatus
} from '@/types/program-progress';

/**
 * Calculate overall progress percentage for a category
 */
export function calculateCategoryProgress(requirements: Requirement[]): number {
  if (requirements.length === 0) return 0;

  const totalProgress = requirements.reduce((sum, req) => sum + req.progress, 0);
  return Math.round((totalProgress / requirements.length) * 100);
}

/**
 * Calculate planned progress percentage (completed + in-progress + planned)
 */
export function calculatePlannedProgress(
  completed: number,
  inProgress: number,
  planned: number,
  requiredHours: number
): number {
  if (requiredHours === 0) return 0;
  const totalPlanned = completed + inProgress + planned;
  return Math.round((totalPlanned / requiredHours) * 100);
}

/**
 * Calculate KPIs (completed, in progress, planned, remaining) for a category
 */
export function calculateCategoryKpis(requirements: Requirement[], requiredHours?: number): {
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
} {
  let completed = 0;
  let inProgress = 0;
  let planned = 0;

  requirements.forEach(req => {
    if (req.status === 'SATISFIED' || req.status === 'WAIVED') {
      completed += req.fraction?.num || 0;
    } else if (req.status === 'PARTIAL') {
      // Count courses in the requirement
      req.subrequirements?.forEach(sub => {
        sub.courses.forEach(course => {
          if (course.status === 'COMPLETED') {
            completed += course.credits;
          } else if (course.status === 'IN_PROGRESS') {
            inProgress += course.credits;
          } else if (course.status === 'PLANNED') {
            planned += course.credits;
          }
        });
      });
    }
  });

  const totalAccounted = completed + inProgress + planned;
  const remaining = Math.max(0, (requiredHours || 0) - totalAccounted);

  return { completed, inProgress, planned, remaining };
}

/**
 * Map course status to display color
 */
export function getCourseStatusColor(status: CourseStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'var(--primary)';
    case 'IN_PROGRESS':
      return 'var(--action-info)';
    case 'PLANNED':
      return 'var(--muted-foreground)';
    case 'ELIGIBLE':
      return 'var(--accent)';
    case 'NOT_APPLICABLE':
      return 'var(--border)';
    default:
      return 'var(--muted)';
  }
}

/**
 * Get category color variable
 * Fallback to primary if category color not defined
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    MAJOR: 'var(--major, var(--primary))',
    MINOR: 'var(--minor, #1e3a8a)',
    GE: 'var(--ge, #2563eb)',
    RELIGION: 'var(--religion, #7c3aed)',
    ELECTIVES: 'var(--electives, #8b5cf6)',
  };

  return colorMap[category] || 'var(--primary)';
}

/**
 * Get light tint of category color for backgrounds
 */
export function getCategoryTint(category: string): string {
  const tintMap: Record<string, string> = {
    MAJOR: 'var(--major-tint, rgba(18, 249, 135, 0.05))',
    MINOR: 'var(--minor-tint, rgba(30, 58, 138, 0.05))',
    GE: 'var(--ge-tint, rgba(37, 99, 235, 0.05))',
    RELIGION: 'var(--religion-tint, rgba(124, 58, 237, 0.05))',
    ELECTIVES: 'var(--electives-tint, rgba(139, 92, 246, 0.05))',
  };

  return tintMap[category] || 'var(--muted)';
}

/**
 * Calculate subrequirement progress
 */
export function calculateSubrequirementProgress(
  subreq: SubRequirement,
  appliedCourses: CourseRef[]
): number {
  if (subreq.status === 'WAIVED' || subreq.status === 'SUBSTITUTED') {
    return 1.0;
  }

  if (subreq.minCredits) {
    const earnedCredits = appliedCourses
      .filter(c => c.status === 'COMPLETED' || c.status === 'IN_PROGRESS')
      .reduce((sum, c) => sum + c.credits, 0);
    return Math.min(1.0, earnedCredits / subreq.minCredits);
  }

  if (subreq.minCount) {
    const completedCount = appliedCourses.filter(
      c => c.status === 'COMPLETED' || c.status === 'IN_PROGRESS'
    ).length;
    return Math.min(1.0, completedCount / subreq.minCount);
  }

  return appliedCourses.some(c => c.status === 'COMPLETED') ? 1.0 : 0;
}

/**
 * Format progress fraction for display
 */
export function formatProgressFraction(
  num: number,
  den: number,
  unit?: 'hrs' | 'courses'
): string {
  const displayNum = Number.isInteger(num) ? num : num.toFixed(1);
  const displayDen = Number.isInteger(den) ? den : den.toFixed(1);

  if (unit === 'courses') {
    return `${displayNum}/${displayDen}`;
  }

  return `${displayNum}/${displayDen}`;
}

/**
 * Determine requirement status based on progress
 */
export function determineRequirementStatus(
  progress: number,
  isWaived: boolean = false,
  isSubstituted: boolean = false
): 'SATISFIED' | 'PARTIAL' | 'UNSATISFIED' | 'WAIVED' | 'SUBSTITUTED' {
  if (isWaived) return 'WAIVED';
  if (isSubstituted) return 'SUBSTITUTED';
  if (progress >= 1.0) return 'SATISFIED';
  if (progress > 0) return 'PARTIAL';
  return 'UNSATISFIED';
}

/**
 * Get status badge text
 */
export function getStatusBadgeText(
  status: 'SATISFIED' | 'PARTIAL' | 'UNSATISFIED' | 'WAIVED' | 'SUBSTITUTED'
): string {
  switch (status) {
    case 'SATISFIED':
      return 'Complete';
    case 'PARTIAL':
      return 'In Progress';
    case 'WAIVED':
      return 'Waived';
    case 'SUBSTITUTED':
      return 'Substituted';
    default:
      return 'Not Started';
  }
}
