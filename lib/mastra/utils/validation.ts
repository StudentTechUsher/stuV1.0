/**
 * Validation Utilities for Mastra Agent
 *
 * Credit limits, conflict detection, and other validation logic
 */

import { CourseSectionWithMeetings, SchedulerEvent, calculateDuration } from '@/lib/mastra/types';
import { CourseSelection } from '@/lib/services/scheduleService';

/**
 * Validate total credits against max limit
 */
export function validateTotalCredits(
  selectedCourses: CourseSelection[],
  newCourse: CourseSectionWithMeetings,
  maxCredits: number
): { valid: boolean; warning?: string; currentTotal: number; newTotal: number } {
  const currentTotal = selectedCourses.reduce(
    (sum, sel) => sum + (sel.primary_offering_id ? 0 : 0), // TODO: Need to fetch credits from offerings
    0
  );

  const newCourseCredits = newCourse.credits_decimal || 3; // Default to 3 if not specified
  const newTotal = currentTotal + newCourseCredits;

  if (newTotal > maxCredits) {
    return {
      valid: false,
      currentTotal,
      newTotal,
      warning: `Adding ${newCourse.course_code} (${newCourseCredits} credits) would exceed your limit of ${maxCredits} credits (total: ${newTotal}).`,
    };
  }

  if (newTotal > maxCredits - 2) {
    return {
      valid: true,
      currentTotal,
      newTotal,
      warning: `This brings you to ${newTotal} credits, close to your ${maxCredits} credit limit.`,
    };
  }

  return { valid: true, currentTotal, newTotal };
}

/**
 * Calculate total credit hours from course selections
 * (Helper for credit validation)
 */
export function calculateTotalCredits(
  selections: Array<{ credits: number | null }>,
  defaultCredits = 3
): number {
  return selections.reduce((sum, sel) => sum + (sel.credits || defaultCredits), 0);
}

/**
 * Validate that a section doesn't create unrealistic schedule
 * (e.g., classes starting at 7am and ending at 10pm same day)
 */
export function validateReasonableSchedule(
  dayOfWeek: number,
  newStartTime: string,
  newEndTime: string,
  calendar: SchedulerEvent[]
): { valid: boolean; warning?: string } {
  const eventsOnDay = calendar.filter(
    (event) => event.dayOfWeek === dayOfWeek && event.category === 'Course'
  );

  if (eventsOnDay.length === 0) {
    return { valid: true };
  }

  // Find earliest and latest times on this day
  const allTimes = [
    ...eventsOnDay.map((e) => e.startTime),
    ...eventsOnDay.map((e) => e.endTime),
    newStartTime,
    newEndTime,
  ];

  const earliestTime = allTimes.reduce((min, time) => (time < min ? time : min));
  const latestTime = allTimes.reduce((max, time) => (time > max ? time : max));

  const totalDayDuration = calculateDuration(earliestTime, latestTime);

  // Warn if day spans more than 12 hours
  if (totalDayDuration > 12 * 60) {
    return {
      valid: true, // Still valid, just warn
      warning: `This creates a long day (${earliestTime} - ${latestTime}, ${(totalDayDuration / 60).toFixed(1)} hours). Consider if this is realistic.`,
    };
  }

  return { valid: true };
}

/**
 * Check if section has minimum break time between classes
 */
export function validateMinimumBreakTime(
  newStartTime: string,
  newEndTime: string,
  calendar: SchedulerEvent[],
  minBreakMinutes: number
): { valid: boolean; warning?: string } {
  for (const event of calendar) {
    if (event.category !== 'Course') {
      continue;
    }

    const gap = getGapBetweenTimes(event.endTime, newStartTime);
    if (gap !== null && gap >= 0 && gap < minBreakMinutes) {
      return {
        valid: true, // Valid but warn
        warning: `Only ${gap} minute break between ${event.title} and this class (recommended: ${minBreakMinutes} min)`,
      };
    }

    const gap2 = getGapBetweenTimes(newEndTime, event.startTime);
    if (gap2 !== null && gap2 >= 0 && gap2 < minBreakMinutes) {
      return {
        valid: true,
        warning: `Only ${gap2} minute break between this class and ${event.title} (recommended: ${minBreakMinutes} min)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Helper: Calculate gap between two times
 */
function getGapBetweenTimes(endTime: string, startTime: string): number | null {
  const toMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const endMin = toMinutes(endTime);
  const startMin = toMinutes(startTime);

  if (endMin <= startMin) {
    return startMin - endMin;
  }

  return null; // Times overlap or in wrong order
}

/**
 * Validate waitlist position against preference
 */
export function validateWaitlistPosition(
  waitlistCount: number,
  maxWaitlistPosition?: number
): { valid: boolean; warning?: string } {
  if (maxWaitlistPosition === undefined) {
    return { valid: true };
  }

  if (waitlistCount > maxWaitlistPosition) {
    return {
      valid: false,
      warning: `Waitlist position #${waitlistCount} exceeds your maximum of #${maxWaitlistPosition}`,
    };
  }

  return { valid: true };
}
