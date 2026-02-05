/**
 * Mastra Tools for Course Selection Agent
 *
 * These tools are thin wrappers around service layer functions,
 * following the service layer pattern per CLAUDE.md.
 *
 * Tools:
 * 1. getCourseOfferingsForCourse - Fetch sections for a single course
 * 2. checkSectionConflicts - Detect time overlaps with calendar
 * 3. rankSectionsByPreferences - Score and rank sections by preferences
 * 4. addCourseSelection - Save course selection to database
 */

import {
  CourseSectionWithMeetings,
  SectionConflictCheck,
  ConflictDetail,
  RankedSection,
  SectionMatchDetails,
  AddCourseSelectionInput,
  CourseSelectionResult,
  SchedulerEvent,
  ParsedMeeting,
  parseDaysString,
  getTimeOfDay,
  timeRangesOverlap,
  calculateDuration,
  ConflictDetectionError,
  RankingError,
  NoValidSectionsError,
} from '@/lib/mastra/types';
import { SchedulePreferences } from '@/lib/services/scheduleService';
import { fetchCourseOfferingsForTerm } from '@/lib/services/generateScheduleService';
import { CourseSection } from '@/lib/services/courseOfferingService';
import { addCourseSelection as addCourseSelectionService } from '@/lib/services/scheduleService';

// ============================================================================
// Tool 1: getCourseOfferingsForCourse
// ============================================================================

/**
 * Fetches all available sections for a single course
 * Thin wrapper around existing fetchCourseOfferingsForTerm service
 *
 * @param universityId - University ID
 * @param termName - Term name (e.g., "Fall 2026")
 * @param courseCode - Course code (e.g., "CS 450")
 * @returns Array of course sections with parsed meeting times
 */
export async function getCourseOfferingsForCourse(
  universityId: number,
  termName: string,
  courseCode: string
): Promise<CourseSectionWithMeetings[]> {
  console.log('🔍 [getCourseOfferingsForCourse] Starting fetch:', {
    universityId,
    termName,
    courseCode,
    timestamp: new Date().toISOString()
  });

  try {
    // Call existing service (handles normalization, fetching, error handling)
    const sections = await fetchCourseOfferingsForTerm(universityId, termName, [courseCode]);

    console.log('✅ [getCourseOfferingsForCourse] Fetched sections:', {
      courseCode,
      sectionCount: sections.length,
      sections: sections.map(s => ({
        id: s.offering_id,
        section: s.section_label,
        instructor: s.instructor,
        waitlist: s.waitlist_count,
        meetings: s.meetings_json
      }))
    });

    if (sections.length === 0) {
      console.warn('⚠️ [getCourseOfferingsForCourse] No sections found for course:', {
        courseCode,
        termName,
        universityId
      });
    }

    // Enhance sections with parsed meeting times for easier access
    const enhancedSections = sections.map((section) => {
      const parsedMeetings = parseMeetingsJson(section.meetings_json);
      return {
        ...section,
        parsedMeetings,
      };
    });

    console.log('✅ [getCourseOfferingsForCourse] Enhanced sections with parsed meetings:', {
      courseCode,
      enhancedCount: enhancedSections.length
    });

    return enhancedSections;
  } catch (error) {
    console.error('❌ [getCourseOfferingsForCourse] Error fetching course offerings:', {
      courseCode,
      termName,
      universityId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Helper: Parse meetings_json into structured ParsedMeeting objects
 */
function parseMeetingsJson(meetingsJson: Record<string, unknown> | null): ParsedMeeting[] {
  if (!meetingsJson) {
    return [];
  }

  // meetings_json format: { days: "MWF", start: "09:00", end: "10:30", location: "..." }
  // Could also be an array in some cases, so handle both
  const meetingsArray = Array.isArray(meetingsJson) ? meetingsJson : [meetingsJson];

  const parsedMeetings: ParsedMeeting[] = meetingsArray
    .map((meeting) => {
      const days = meeting.days as string;
      const start = (meeting.start || meeting.start_time) as string;
      const end = (meeting.end || meeting.end_time) as string;
      const location = meeting.location as string | undefined;

      if (!days || !start || !end) {
        return null;
      }

      const parsed: ParsedMeeting = {
        days,
        daysOfWeek: parseDaysString(days),
        startTime: start,
        endTime: end,
      };

      if (location) {
        parsed.location = location;
      }

      return parsed;
    })
    .filter((m): m is ParsedMeeting => m !== null);

  return parsedMeetings;
}

// ============================================================================
// Tool 2: checkSectionConflicts
// ============================================================================

/**
 * Checks if a course section conflicts with current calendar events
 *
 * Conflict types:
 * - time_overlap: Section meets at same time as existing event
 * - back_to_back: Section ends/starts within 10 min of another event (different buildings)
 * - exceeds_daily_hours: Adding section would exceed max_daily_hours preference
 * - blocks_lunch: Section blocks lunch time when lunch_break_required is true
 *
 * @param section - Course section to check
 * @param currentCalendar - All events currently on calendar (personal + courses)
 * @param preferences - User's schedule preferences (for daily hour limits, lunch breaks)
 * @returns Conflict check result
 */
export async function checkSectionConflicts(
  section: CourseSectionWithMeetings,
  currentCalendar: SchedulerEvent[],
  preferences: SchedulePreferences
): Promise<SectionConflictCheck> {
  console.log('🔍 [checkSectionConflicts] Starting conflict check:', {
    section: {
      id: section.offering_id,
      label: section.section_label,
      course: section.course_code,
      meetingCount: section.parsedMeetings?.length || 0
    },
    calendarEventCount: currentCalendar.length,
    preferences: Object.keys(preferences)
  });

  const conflicts: ConflictDetail[] = [];

  try {
    if (!section.parsedMeetings || section.parsedMeetings.length === 0) {
      console.log('ℹ️ [checkSectionConflicts] No meeting times (online/async course), no conflicts');
      return { hasConflict: false, conflicts: [] };
    }

    // Check each meeting time against calendar
    for (const meeting of section.parsedMeetings) {
      for (const dayOfWeek of meeting.daysOfWeek) {
        // Find all events on this day
        const eventsOnDay = currentCalendar.filter((event) => event.dayOfWeek === dayOfWeek);

        for (const event of eventsOnDay) {
          // Check time overlap
          if (timeRangesOverlap(meeting.startTime, meeting.endTime, event.startTime, event.endTime)) {
            conflicts.push({
              conflictingEvent: event,
              conflictType: 'time_overlap',
              message: `Overlaps with ${event.title} (${getDayName(dayOfWeek)} ${event.startTime}-${event.endTime})`,
            });
          }

          // Check back-to-back (< 10 min gap between events)
          const gap = getGapBetweenEvents(
            meeting.startTime,
            meeting.endTime,
            event.startTime,
            event.endTime
          );
          if (gap !== null && gap < 10 && gap >= 0) {
            // Only flag if different locations (can't make it in time)
            if (meeting.location && event.location && meeting.location !== event.location) {
              conflicts.push({
                conflictingEvent: event,
                conflictType: 'back_to_back',
                message: `Back-to-back with ${event.title} in different building (${gap} min gap)`,
              });
            }
          }
        }

        // Check daily hour limits
        if (preferences.max_daily_hours) {
          const totalHoursOnDay = calculateTotalHoursOnDay(
            dayOfWeek,
            currentCalendar,
            meeting.startTime,
            meeting.endTime
          );
          if (totalHoursOnDay > preferences.max_daily_hours) {
            conflicts.push({
              conflictingEvent: {
                id: 'daily-limit',
                title: 'Daily Hour Limit',
                dayOfWeek,
                startTime: '00:00',
                endTime: '23:59',
              },
              conflictType: 'exceeds_daily_hours',
              message: `Exceeds daily hour limit of ${preferences.max_daily_hours} hours (would be ${totalHoursOnDay.toFixed(1)} hours)`,
            });
          }
        }

        // Check lunch break conflicts
        if (preferences.lunch_break_required && preferences.lunch_start_time && preferences.lunch_end_time) {
          if (
            timeRangesOverlap(
              meeting.startTime,
              meeting.endTime,
              preferences.lunch_start_time,
              preferences.lunch_end_time
            )
          ) {
            conflicts.push({
              conflictingEvent: {
                id: 'lunch-break',
                title: 'Lunch Break',
                dayOfWeek,
                startTime: preferences.lunch_start_time,
                endTime: preferences.lunch_end_time,
              },
              conflictType: 'blocks_lunch',
              message: `Blocks lunch time (${preferences.lunch_start_time}-${preferences.lunch_end_time})`,
            });
          }
        }
      }
    }

    const result = {
      hasConflict: conflicts.length > 0,
      conflicts,
    };

    if (result.hasConflict) {
      console.log('⚠️ [checkSectionConflicts] Conflicts found:', {
        conflictCount: conflicts.length,
        conflictTypes: conflicts.map(c => c.conflictType)
      });
    } else {
      console.log('✅ [checkSectionConflicts] No conflicts found');
    }

    return result;
  } catch (error) {
    console.error('❌ [checkSectionConflicts] Error:', {
      section: section.offering_id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new ConflictDetectionError('Failed to check conflicts', error);
  }
}

// ============================================================================
// Tool 3: rankSectionsByPreferences
// ============================================================================

/**
 * Ranks course sections by how well they match user preferences
 *
 * Scoring algorithm (0-100):
 * - Base score: 50
 * - +20 if time slot matches preferred_time (morning/afternoon/evening)
 * - +10 if days match preferred_days
 * - +10 if seats available (not waitlisted)
 * - +5 if doesn't violate max_daily_hours
 * - +5 if respects lunch_break_required
 * - -20 if waitlisted and allow_waitlist = false
 *
 * @param sections - Non-conflicting sections to rank
 * @param preferences - User's schedule preferences
 * @returns Array of ranked sections (sorted by score descending)
 */
export async function rankSectionsByPreferences(
  sections: CourseSectionWithMeetings[],
  preferences: SchedulePreferences
): Promise<RankedSection[]> {
  try {
    const rankedSections: RankedSection[] = sections.map((section) => {
      const scoreBreakdown = {
        baseScore: 50,
        timeBonus: 0,
        dayBonus: 0,
        availabilityBonus: 0,
        dailyHoursBonus: 0,
        lunchBreakBonus: 0,
        waitlistPenalty: 0,
      };

      const pros: string[] = [];
      const cons: string[] = [];

      // Check waitlist status
      const waitlistStatus =
        section.seats_available && section.seats_available > 0
          ? 'available'
          : section.waitlist_count && section.waitlist_count > 0
            ? 'waitlisted'
            : 'full';

      // Parse meeting times
      const meetings = section.parsedMeetings || [];
      if (meetings.length === 0) {
        // Online/async course - neutral score
        return {
          section,
          score: 50,
          matchDetails: {
            timeMatch: false,
            dayMatch: false,
            waitlistStatus,
            pros: ['Online/Async course'],
            cons: [],
            scoreBreakdown,
          },
        };
      }

      const primaryMeeting = meetings[0]; // Use first meeting for scoring

      // 1. Time preference match (+20)
      if (preferences.earliest_class_time || preferences.latest_class_time) {
        const timeOfDay = getTimeOfDay(primaryMeeting.startTime);
        // Infer preferred time from earliest/latest constraints
        const preferredTime = inferPreferredTime(
          preferences.earliest_class_time,
          preferences.latest_class_time
        );

        if (preferredTime && timeOfDay === preferredTime) {
          scoreBreakdown.timeBonus = 20;
          pros.push(`${capitalize(timeOfDay)} time slot (your preference)`);
        } else if (preferredTime) {
          cons.push(`${capitalize(timeOfDay)} time (you prefer ${preferredTime})`);
        }
      }

      // 2. Day preference match (+10)
      if (preferences.preferred_days && preferences.preferred_days.length > 0) {
        const sectionDays = primaryMeeting.daysOfWeek;
        const matchesDays = sectionDays.some((day) => preferences.preferred_days!.includes(day));

        if (matchesDays) {
          scoreBreakdown.dayBonus = 10;
          pros.push(`Meets on ${primaryMeeting.days} (preferred days)`);
        } else {
          cons.push(`Meets on ${primaryMeeting.days} (not preferred)`);
        }
      }

      // Check avoid_days
      if (preferences.avoid_days && preferences.avoid_days.length > 0) {
        const sectionDays = primaryMeeting.daysOfWeek;
        const hasAvoidedDay = sectionDays.some((day) => preferences.avoid_days!.includes(day));

        if (hasAvoidedDay) {
          scoreBreakdown.dayBonus -= 10; // Penalty for avoided days
          cons.push(`Meets on avoided day`);
        }
      }

      // 3. Availability bonus (+10)
      if (waitlistStatus === 'available') {
        scoreBreakdown.availabilityBonus = 10;
        pros.push(`Seats available (${section.seats_available} open)`);
      } else if (waitlistStatus === 'waitlisted') {
        if (preferences.allow_waitlist === false) {
          scoreBreakdown.waitlistPenalty = -20;
          cons.push(`Waitlisted (position #${section.waitlist_count})`);
        } else {
          cons.push(`Waitlisted (position #${section.waitlist_count})`);
        }
      } else {
        scoreBreakdown.waitlistPenalty = -20;
        cons.push('Section full');
      }

      // 4. Daily hours bonus (+5)
      if (preferences.max_daily_hours) {
        // Check if any day would exceed limit
        const exceedsLimit = primaryMeeting.daysOfWeek.some((_day) => {
          const duration = calculateDuration(primaryMeeting.startTime, primaryMeeting.endTime);
          return duration / 60 > preferences.max_daily_hours!;
        });

        if (!exceedsLimit) {
          scoreBreakdown.dailyHoursBonus = 5;
        } else {
          cons.push(`Exceeds daily hour limit`);
        }
      }

      // 5. Lunch break bonus (+5)
      if (preferences.lunch_break_required && preferences.lunch_start_time && preferences.lunch_end_time) {
        const blocksLunch = timeRangesOverlap(
          primaryMeeting.startTime,
          primaryMeeting.endTime,
          preferences.lunch_start_time,
          preferences.lunch_end_time
        );

        if (!blocksLunch) {
          scoreBreakdown.lunchBreakBonus = 5;
        } else {
          cons.push('Blocks lunch time');
        }
      }

      // Calculate total score
      const totalScore = Math.max(
        0,
        Math.min(
          100,
          scoreBreakdown.baseScore +
            scoreBreakdown.timeBonus +
            scoreBreakdown.dayBonus +
            scoreBreakdown.availabilityBonus +
            scoreBreakdown.dailyHoursBonus +
            scoreBreakdown.lunchBreakBonus +
            scoreBreakdown.waitlistPenalty
        )
      );

      return {
        section,
        score: totalScore,
        matchDetails: {
          timeMatch: scoreBreakdown.timeBonus > 0,
          dayMatch: scoreBreakdown.dayBonus > 0,
          waitlistStatus,
          pros,
          cons,
          scoreBreakdown,
        },
      };
    });

    // Sort by score descending
    rankedSections.sort((a, b) => b.score - a.score);

    return rankedSections;
  } catch (error) {
    console.error('Error ranking sections:', error);
    throw new RankingError('Failed to rank sections', error);
  }
}

// ============================================================================
// Tool 4: addCourseSelection
// ============================================================================

/**
 * Saves user's course selection (primary + backups) to database
 * Thin wrapper around scheduleService.addCourseSelection
 *
 * @param input - Course selection data
 * @returns Result with success flag, selection ID, and calendar event
 */
export async function addCourseSelection(
  input: AddCourseSelectionInput
): Promise<CourseSelectionResult> {
  try {
    const result = await addCourseSelectionService(input.scheduleId, {
      course_code: input.courseCode,
      requirement_type: input.requirementType || null,
      primary_offering_id: input.primaryOfferingId,
      backup_1_offering_id: input.backup1OfferingId,
      backup_2_offering_id: input.backup2OfferingId,
      status: input.isWaitlisted ? 'waitlisted' : 'planned',
      notes: input.notes || null,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // TODO: Fetch the section details and create calendar event
    // For now, return success without calendar event
    // (Calendar update will be handled separately)

    return {
      success: true,
      selectionId: result.selectionId,
    };
  } catch (error) {
    console.error('Error adding course selection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDayName(dayOfWeek: number): string {
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek] || '';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculate gap between two events in minutes
 * Returns null if events overlap
 */
function getGapBetweenEvents(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): number | null {
  const toMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);

  // If event1 ends before event2 starts
  if (end1Min <= start2Min) {
    return start2Min - end1Min;
  }

  // If event2 ends before event1 starts
  const end2Min = toMinutes(end2);
  const start1Min = toMinutes(start1);
  if (end2Min <= start1Min) {
    return start1Min - end2Min;
  }

  // Events overlap
  return null;
}

/**
 * Calculate total hours of classes on a specific day
 * (including the new meeting being checked)
 */
function calculateTotalHoursOnDay(
  dayOfWeek: number,
  calendar: SchedulerEvent[],
  newStartTime: string,
  newEndTime: string
): number {
  const eventsOnDay = calendar.filter((event) => event.dayOfWeek === dayOfWeek);

  let totalMinutes = calculateDuration(newStartTime, newEndTime);

  for (const event of eventsOnDay) {
    if (event.category === 'Course') {
      totalMinutes += calculateDuration(event.startTime, event.endTime);
    }
  }

  return totalMinutes / 60;
}

/**
 * Infer preferred time of day from earliest/latest class time preferences
 */
function inferPreferredTime(
  earliestTime?: string,
  latestTime?: string
): 'morning' | 'afternoon' | 'evening' | null {
  if (!earliestTime && !latestTime) {
    return null;
  }

  // If earliest is late (e.g., 12:00+), user prefers afternoon/evening
  if (earliestTime) {
    const hour = parseInt(earliestTime.split(':')[0], 10);
    if (hour >= 12) {
      return 'afternoon';
    } else if (hour >= 8) {
      return 'morning';
    }
  }

  // If latest is early (e.g., before 14:00), user prefers morning
  if (latestTime) {
    const hour = parseInt(latestTime.split(':')[0], 10);
    if (hour < 14) {
      return 'morning';
    } else if (hour < 17) {
      return 'afternoon';
    }
  }

  return null;
}
