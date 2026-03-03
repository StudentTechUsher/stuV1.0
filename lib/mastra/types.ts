/**
 * Type definitions for Mastra Course Selection Agent
 *
 * This file contains all TypeScript types used by the Mastra agent workflow
 * for course-by-course scheduling.
 */

import { SchedulePreferences, BlockedTime } from '@/lib/services/scheduleService';
import { CourseSection } from '@/lib/services/courseOfferingService';

// ============================================================================
// Agent Session Input
// ============================================================================

/**
 * Input for starting a new course selection agent session
 */
export interface CourseSelectionSessionInput {
  scheduleId: string;
  studentId: number;
  universityId: number;
  termName: string;
  gradPlanCourses: string[]; // Course codes to schedule (from grad plan)
  preferences: SchedulePreferences;
  existingCalendar: SchedulerEvent[]; // Personal events + any already-selected courses
}

// ============================================================================
// Tool: getCourseOfferingsForCourse
// ============================================================================

/**
 * Output from getCourseOfferingsForCourse tool
 * Extended CourseSection with parsed meeting details
 */
export interface CourseSectionWithMeetings extends CourseSection {
  // Inherited from CourseSection:
  // offering_id: number;
  // course_code: string;
  // section_label: string;
  // meetings_json: Record<string, unknown> | null;
  // instructor: string | null;
  // seats_available: number | null;
  // waitlist_count: number | null;
  // credits_decimal: number | null;

  // Parsed meeting details for easier access
  parsedMeetings?: ParsedMeeting[];
}

/**
 * Parsed meeting time from meetings_json
 */
export interface ParsedMeeting {
  days: string; // "MWF", "TTh", etc.
  daysOfWeek: number[]; // [1, 3, 5] for MWF (1=Mon, 2=Tue, etc.)
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  location?: string;
}

// ============================================================================
// Tool: checkSectionConflicts
// ============================================================================

/**
 * Output from checkSectionConflicts tool
 */
export interface SectionConflictCheck {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
}

/**
 * Details about a specific conflict
 */
export interface ConflictDetail {
  conflictingEvent: SchedulerEvent;
  conflictType: 'time_overlap' | 'back_to_back' | 'exceeds_daily_hours' | 'blocks_lunch' | 'outside_time_window';
  message: string; // Human-readable description: "Overlaps with Work (M 9:00-10:00)"
}

// ============================================================================
// Tool: rankSectionsByPreferences
// ============================================================================

/**
 * Output from rankSectionsByPreferences tool
 * Array of ranked sections with scores
 */
export interface RankedSection {
  section: CourseSectionWithMeetings;
  score: number; // 0-100
  matchDetails: SectionMatchDetails;
}

/**
 * Details about how well a section matches user preferences
 */
export interface SectionMatchDetails {
  timeMatch: boolean; // Matches preferred_time (morning/afternoon/evening)
  dayMatch: boolean; // Meets on preferred_days
  waitlistStatus: 'available' | 'waitlisted' | 'full';
  pros: string[]; // ["Morning time slot", "MWF as preferred"]
  cons: string[]; // ["Section waitlisted", "Friday class"]

  // Detailed scoring breakdown
  scoreBreakdown: {
    baseScore: number;
    timeBonus: number;
    dayBonus: number;
    availabilityBonus: number;
    dailyHoursBonus: number;
    lunchBreakBonus: number;
    waitlistPenalty: number;
  };
}

// ============================================================================
// Tool: addCourseSelection
// ============================================================================

/**
 * Input for addCourseSelection tool
 */
export interface AddCourseSelectionInput {
  scheduleId: string;
  courseCode: string;
  primaryOfferingId: number;
  backup1OfferingId: number | null;
  backup2OfferingId: number | null;
  isWaitlisted: boolean;
  requirementType?: string | null;
  notes?: string | null;
}

/**
 * Output from addCourseSelection tool
 */
export interface CourseSelectionResult {
  success: boolean;
  selectionId?: string;
  calendarEvent?: SchedulerEvent; // Event to add to calendar
  error?: string;
}

// ============================================================================
// Agent Conversation State
// ============================================================================

/**
 * Agent conversation state (tracked by Mastra)
 * Represents where we are in the course-by-course selection process
 */
export interface AgentConversationState {
  // Progress tracking
  currentCourseIndex: number; // 0-based index
  totalCourses: number;
  coursesCompleted: string[]; // Course codes already scheduled

  // Current course being processed
  currentCourse?: {
    code: string;
    title?: string;
    availableSections: CourseSectionWithMeetings[];
    rankedSections: RankedSection[];
    primarySelected?: CourseSectionWithMeetings;
    backup1Selected?: CourseSectionWithMeetings;
    backup2Selected?: CourseSectionWithMeetings;
    awaitingBackupCount: number; // 0, 1, or 2 (how many backups still needed)
  };

  // Live calendar (updated as courses are added)
  calendarEvents: SchedulerEvent[];

  // Session metadata
  sessionId: string;
  scheduleId: string;
  studentId: number;
  universityId: number;
  termName: string;
  preferences: SchedulePreferences;
}

// ============================================================================
// Calendar Event Types
// ============================================================================

/**
 * Scheduler event for calendar display
 * Used for both personal events (blocked times) and course selections
 */
export interface SchedulerEvent {
  id: string;
  title: string;
  dayOfWeek: number; // 1=Mon, 2=Tue, ..., 6=Sat
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  location?: string;
  category?: 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other' | 'Course';
  backgroundColor?: string;
  textColor?: string;

  // For course events
  courseCode?: string;
  sectionLabel?: string;
  instructor?: string;
  offeringId?: number;
}

// ============================================================================
// Section Selection Types (for SectionReviewStep)
// ============================================================================

/**
 * User's section selection for a course
 * Used in the Section Review step before AI agent
 */
export interface ReviewStepSectionSelection {
  courseCode: string;
  sectionLabel: string;
  rank: 'primary' | 'backup1' | 'backup2';
  offeringId?: number; // Set when saving to database
}

// ============================================================================
// Agent Message Types
// ============================================================================

/**
 * Content structure for agent messages
 * Includes text, visual cards, and interactive options
 */
export interface AgentMessageContent {
  text: string; // Main message text
  sectionCards?: SectionCardData[]; // Visual section cards to display
  options?: MessageOption[]; // Interactive buttons/choices
  prompt?: string; // Call-to-action prompt
  calendarUpdate?: SchedulerEvent; // New event to add to calendar
}

/**
 * Data for rendering a section selection card
 */
export interface SectionCardData {
  section: CourseSectionWithMeetings;
  score: number;
  pros: string[];
  cons: string[];
  status: 'available' | 'waitlisted' | 'full';
  waitlistPosition?: number;
}

/**
 * Interactive option in agent message
 */
export interface MessageOption {
  label: string; // Button text
  value: string; // Value to send to agent
  variant?: 'primary' | 'secondary' | 'danger'; // Button styling
}

// ============================================================================
// Error Types (for robust error handling)
// ============================================================================

export class CourseSelectionAgentError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CourseSelectionAgentError';
  }
}

export class NoValidSectionsError extends Error {
  constructor(public courseCode: string) {
    super(`No valid sections available for ${courseCode}`);
    this.name = 'NoValidSectionsError';
  }
}

export class ConflictDetectionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ConflictDetectionError';
  }
}

export class RankingError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'RankingError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Time range for conflict checking
 */
export interface TimeRange {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Day of week mapping
 */
export const DayOfWeekMap = {
  M: 1,
  T: 2,
  W: 3,
  Th: 4,
  R: 4, // Sometimes Thursday is 'R'
  F: 5,
  S: 6,
} as const;

/**
 * Time of day categories for preference matching
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/**
 * Helper to convert "MWF" string to array of day numbers
 */
export function parseDaysString(daysStr: string): number[] {
  const days: number[] = [];
  let i = 0;

  while (i < daysStr.length) {
    // Check for two-character patterns first (Th)
    if (i < daysStr.length - 1 && daysStr.substring(i, i + 2) === 'Th') {
      days.push(DayOfWeekMap.Th);
      i += 2;
    } else if (i < daysStr.length - 1 && daysStr.substring(i, i + 2) === 'th') {
      days.push(DayOfWeekMap.Th);
      i += 2;
    } else {
      // Single character day
      const char = daysStr[i].toUpperCase() as keyof typeof DayOfWeekMap;
      if (DayOfWeekMap[char]) {
        days.push(DayOfWeekMap[char]);
      }
      i += 1;
    }
  }

  return [...new Set(days)]; // Remove duplicates
}

/**
 * Helper to determine time of day from time string
 */
export function getTimeOfDay(timeStr: string): TimeOfDay {
  const hour = parseInt(timeStr.split(':')[0], 10);

  if (hour >= 6 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}

/**
 * Normalizes time string to 24-hour format (HH:MM)
 * Handles both 12-hour (e.g., "9:30 AM", "2 PM") and 24-hour (e.g., "09:30") formats
 */
export function normalizeTimeFormat(timeStr: string): string {
  const trimmed = timeStr.trim();

  // Already in 24-hour format (HH:MM)
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    const normalized = `${hours.padStart(2, '0')}:${minutes}`;
    return normalized;
  }

  // 12-hour format with AM/PM
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) {
    console.warn(`⚠️ [normalizeTimeFormat] Unable to parse time: "${timeStr}", returning as-is`);
    return trimmed;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const normalized = `${hours.toString().padStart(2, '0')}:${minutes}`;
  return normalized;
}

/**
 * Helper to check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Normalize times to 24-hour format first
  const normalizedStart1 = normalizeTimeFormat(start1);
  const normalizedEnd1 = normalizeTimeFormat(end1);
  const normalizedStart2 = normalizeTimeFormat(start2);
  const normalizedEnd2 = normalizeTimeFormat(end2);

  // Convert to minutes since midnight for comparison
  const toMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1Min = toMinutes(normalizedStart1);
  const end1Min = toMinutes(normalizedEnd1);
  const start2Min = toMinutes(normalizedStart2);
  const end2Min = toMinutes(normalizedEnd2);

  // Check if ranges overlap
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Helper to calculate duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  // Normalize times to 24-hour format first
  const normalizedStart = normalizeTimeFormat(startTime);
  const normalizedEnd = normalizeTimeFormat(endTime);

  const toMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  return toMinutes(normalizedEnd) - toMinutes(normalizedStart);
}
