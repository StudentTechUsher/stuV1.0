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

/**
 * DUMMY DATA for personal information panel
 * Real data (email, university, standing) will be passed from UnifiedAcademicCard
 * These are placeholder values for fields not yet wired to backend
 */
export const PERSONAL_INFO_MOCK = {
  netId: 'jpratt02',
  studentId: '557891485',
  birthdate: '12 July 2001',
  age: 24,
};

/**
 * Status level types for color-coded indicators
 */
export type StatusLevel = 'good' | 'warning' | 'critical' | 'info';

/**
 * Status item interface for holds/status display
 */
export interface StatusItem {
  label: string;
  value: string;
  status: StatusLevel;
}

/**
 * DUMMY DATA for status and holds section (POC)
 * Color rules:
 * - good (green): No action required
 * - warning (yellow/orange): Action needed soon
 * - critical (red): Immediate action required
 * - info (blue): Informational, no action needed
 */
export const STATUS_HOLDS_MOCK: StatusItem[] = [
  { label: 'Academic Standing', value: 'GOOD', status: 'good' },
  { label: 'Account Holds', value: 'NO', status: 'good' },
  { label: 'Endorsement', value: 'Valid thru 11 Jan 2027', status: 'good' },
  { label: 'Honor Code Commitment', value: 'Valid thru 4 Nov 2026', status: 'warning' },
  { label: 'Aid Eligibility', value: 'FinAid', status: 'info' },
  // Generic institution-agnostic placeholders for future schools
  { label: 'Immunization Clearance', value: 'CLEARED', status: 'good' },
  { label: 'Advising Required', value: 'NO', status: 'good' },
  { label: 'Tuition Balance', value: '$0.00', status: 'good' },
];

/**
 * BYU-specific links for status items
 * Only shown when university is BYU
 */
export const BYU_STATUS_LINKS: Record<string, string> = {
  'Academic Standing': 'https://aso.byu.edu/general-policies',
  'Account Holds': 'https://sa.byu.edu/psc/ps/EMPLOYEE/HRMS/c/Y_MY_FINANCIAL_CENTER.Y_MFC_HOME_V2_FL.GBL?Page=Y_MFC_HOME_V2_FL',
  'Endorsement': 'https://honorcode.byu.edu/ecclesiastical-endorsements',
  'Honor Code Commitment': 'https://commtech.byu.edu/auth/honor/',
  'Aid Eligibility': 'https://commtech.byu.edu/auth/financial-aid/my-aid/',
};
