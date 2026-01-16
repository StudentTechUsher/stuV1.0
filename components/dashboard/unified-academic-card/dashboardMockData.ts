import type { ProgressCategory } from '@/components/progress-overview/types';

/**
 * DUMMY DATA for overall degree progress
 * This represents total progress across all degree requirements
 * Credit breakdown for segmented bar: completed + inProgress + planned = totalCredits
 */
export const OVERALL_PROGRESS_MOCK = {
  percentage: 63,
  creditsCompleted: 76,      // Solid green - courses already passed
  creditsInProgress: 12,      // 50% transparent - current semester
  creditsPlanned: 32,         // Grey - planned in grad plan
  creditsRemaining: 0,        // Outline only - not yet planned
  totalCredits: 120,
  coursesCompleted: 25,
  coursesRemaining: 15,
  tooltip: "You've completed 63% of your total degree requirements across all programs",
};

/**
 * DUMMY DATA for plan detail progress bars
 * These appear when the overall progress bar is expanded
 */
export const PLAN_DETAILS_MOCK = {
  graduationPlan: {
    percentage: 93,
    label: "Graduation Plan",
    tooltip: "93% of required courses are planned in your graduation plan",
  },
  planFollowThrough: {
    percentage: 70,
    label: "Plan Follow Through",
    tooltip: "How closely your completed courses align with your graduation plan",
  },
  optimization: {
    percentage: 45,
    label: "Optimization",
    tooltip: "Your plan's optimization score based on course sequencing and workload balance",
  },
};

/**
 * DUMMY DATA for dashboard progress overview
 * These values are placeholders until backend wiring is complete.
 * All credit counts and percentages are realistic but mocked.
 */
export const DASHBOARD_MOCK_CATEGORIES: ProgressCategory[] = [
  {
    name: 'Major',
    color: 'var(--primary)',
    totalCredits: 64,
    percentComplete: 68,
    completed: 42,
    inProgress: 9,
    planned: 10,
    remaining: 3,
    requirements: [], // Empty for compact dashboard view
  },
  {
    name: 'Minor',
    color: '#003D82',
    totalCredits: 18,
    percentComplete: 45,
    completed: 8,
    inProgress: 3,
    planned: 4,
    remaining: 3,
    requirements: [],
  },
  {
    name: 'GE',
    color: '#2196f3',
    totalCredits: 39,
    percentComplete: 81,
    completed: 32,
    inProgress: 3,
    planned: 4,
    remaining: 0,
    requirements: [],
  },
  {
    name: 'REL',
    color: '#5E35B1',
    totalCredits: 14,
    percentComplete: 57,
    completed: 8,
    inProgress: 2,
    planned: 4,
    remaining: 0,
    requirements: [],
  },
  {
    name: 'Electives',
    color: '#9C27B0',
    totalCredits: 10,
    percentComplete: 100,
    completed: 10,
    inProgress: 0,
    planned: 0,
    remaining: 0,
    requirements: [],
  },
];

export const DEFAULT_CATEGORY = 'Major';

/**
 * DUMMY credits display when no real data available
 */
export const DUMMY_CREDITS = {
  earned: 76,
  required: 120,
};
