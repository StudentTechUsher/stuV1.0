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
  normalizeTimeFormat,
  ConflictDetectionError,
  RankingError,
  NoValidSectionsError,
} from '@/lib/mastra/types';
import { SchedulePreferences } from '@/lib/services/scheduleService';
import { fetchCourseOfferingsForTerm } from '@/lib/services/generateScheduleService';
import { CourseSection } from '@/lib/services/courseOfferingService';
import { addCourseSelection as addCourseSelectionService } from '@/lib/services/scheduleService';

// ============================================================================
// Tool 1: Validate Course Availability
// ============================================================================

export interface CourseValidationResult {
  courseCode: string;
  status: 'available' | 'not_in_term' | 'not_found';
  targetTerm: string;
  availableIn?: string; // If not in target term, which term is it available in?
  sectionCount?: number;
  message: string;
}

/**
 * Validates that a list of courses are available in the target term
 * For courses not available, searches future terms and suggests alternatives
 *
 * @param universityId - University ID
 * @param targetTerm - Target term name (e.g., "Winter 2026")
 * @param courseCodes - Array of course codes to validate (e.g., ["CS 450", "IS 455"])
 * @returns Validation results for each course
 */
export async function validateCoursesForScheduling(
  universityId: number,
  targetTerm: string,
  courseCodes: string[]
): Promise<CourseValidationResult[]> {
  console.log('🔍 [validateCoursesForScheduling] Starting validation:', {
    universityId,
    targetTerm,
    courseCount: courseCodes.length,
    courses: courseCodes,
  });

  const results: CourseValidationResult[] = [];

  for (const courseCode of courseCodes) {
    console.log(`🔍 [validateCoursesForScheduling] Checking ${courseCode}...`);

    // Check if course exists in target term
    const sectionsInTarget = await getCourseOfferingsForCourse(universityId, targetTerm, courseCode);

    if (sectionsInTarget.length > 0) {
      // Course is available in target term ✅
      results.push({
        courseCode,
        status: 'available',
        targetTerm,
        sectionCount: sectionsInTarget.length,
        message: `Available in ${targetTerm} (${sectionsInTarget.length} section${sectionsInTarget.length > 1 ? 's' : ''})`,
      });
      console.log(`✅ [validateCoursesForScheduling] ${courseCode} available in ${targetTerm}`);
      continue;
    }

    // Course not in target term, search future terms
    console.log(`⚠️ [validateCoursesForScheduling] ${courseCode} not found in ${targetTerm}, searching future terms...`);
    const futureTerms = generateFutureTerms(targetTerm, 4); // Check next 4 terms
    let foundInTerm: string | null = null;

    for (const futureTerm of futureTerms) {
      const sectionsInFuture = await getCourseOfferingsForCourse(universityId, futureTerm, courseCode);
      if (sectionsInFuture.length > 0) {
        foundInTerm = futureTerm;
        console.log(`✅ [validateCoursesForScheduling] ${courseCode} found in ${futureTerm}`);
        break;
      }
    }

    if (foundInTerm) {
      // Found in a future term
      results.push({
        courseCode,
        status: 'not_in_term',
        targetTerm,
        availableIn: foundInTerm,
        message: `Not available in ${targetTerm}, but offered in ${foundInTerm}`,
      });
    } else {
      // Not found in any searched term
      results.push({
        courseCode,
        status: 'not_found',
        targetTerm,
        message: `Not found in ${targetTerm} or next 4 terms. May be deprecated or incorrect code.`,
      });
      console.warn(`❌ [validateCoursesForScheduling] ${courseCode} not found in any searched terms`);
    }
  }

  const summary = {
    total: results.length,
    available: results.filter(r => r.status === 'available').length,
    notInTerm: results.filter(r => r.status === 'not_in_term').length,
    notFound: results.filter(r => r.status === 'not_found').length,
  };

  console.log('✅ [validateCoursesForScheduling] Validation complete:', summary);

  return results;
}

/**
 * Generates future term names in order: Fall → Winter → Spring → Summer
 * @param currentTerm - Current term (e.g., "Winter 2026")
 * @param count - Number of future terms to generate
 * @returns Array of future term names
 */
function generateFutureTerms(currentTerm: string, count: number): string[] {
  const termOrder = ['Winter', 'Spring', 'Summer', 'Fall'];
  const match = currentTerm.match(/^(Fall|Winter|Spring|Summer)\s+(\d{4})$/);

  if (!match) {
    console.warn(`⚠️ [generateFutureTerms] Invalid term format: ${currentTerm}`);
    return [];
  }

  const currentSemester = match[1];
  const currentYear = parseInt(match[2], 10);
  const currentIndex = termOrder.indexOf(currentSemester);

  if (currentIndex === -1) {
    console.warn(`⚠️ [generateFutureTerms] Unknown semester: ${currentSemester}`);
    return [];
  }

  const futureTerms: string[] = [];
  let index = currentIndex;
  let year = currentYear;

  for (let i = 0; i < count; i++) {
    // Move to next term
    index = (index + 1) % termOrder.length;
    if (index === 0) {
      year++; // New year starts with Winter
    }

    futureTerms.push(`${termOrder[index]} ${year}`);
  }

  return futureTerms;
}

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
      console.log('🔍 [checkSectionConflicts] Checking meeting:', {
        days: meeting.days,
        daysOfWeek: meeting.daysOfWeek,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        normalizedStart: normalizeTimeFormat(meeting.startTime),
        normalizedEnd: normalizeTimeFormat(meeting.endTime),
      });

      for (const dayOfWeek of meeting.daysOfWeek) {
        // Find all events on this day
        const eventsOnDay = currentCalendar.filter((event) => event.dayOfWeek === dayOfWeek);
        console.log(`🔍 [checkSectionConflicts] Events on ${getDayName(dayOfWeek)}:`, eventsOnDay.length);

        for (const event of eventsOnDay) {
          console.log('🔍 [checkSectionConflicts] Comparing with event:', {
            title: event.title,
            eventStart: event.startTime,
            eventEnd: event.endTime,
            meetingStart: meeting.startTime,
            meetingEnd: meeting.endTime,
          });

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

        // Check preferred time window (earliest/latest)
        if (preferences.earliest_class_time || preferences.latest_class_time) {
          const normalizedStart = normalizeTimeFormat(meeting.startTime);
          const normalizedEnd = normalizeTimeFormat(meeting.endTime);
          const windowStart = preferences.earliest_class_time
            ? normalizeTimeFormat(preferences.earliest_class_time)
            : null;
          const windowEnd = preferences.latest_class_time
            ? normalizeTimeFormat(preferences.latest_class_time)
            : null;

          const toMinutes = (timeStr: string): number => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const startMin = toMinutes(normalizedStart);
          const endMin = toMinutes(normalizedEnd);
          const windowStartMin = windowStart ? toMinutes(windowStart) : null;
          const windowEndMin = windowEnd ? toMinutes(windowEnd) : null;

          const startsTooEarly = windowStartMin !== null && startMin < windowStartMin;
          const endsTooLate = windowEndMin !== null && endMin > windowEndMin;

          if (startsTooEarly || endsTooLate) {
            const windowLabel = `${preferences.earliest_class_time || '—'}-${preferences.latest_class_time || '—'}`;
            conflicts.push({
              conflictingEvent: {
                id: `time-window-${dayOfWeek}`,
                title: 'Preferred Time Window',
                dayOfWeek,
                startTime: preferences.earliest_class_time || '00:00',
                endTime: preferences.latest_class_time || '23:59',
              },
              conflictType: 'outside_time_window',
              message: `Outside preferred time window (${windowLabel})`,
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

/**
 * Checks conflicts for all sections of a course at once
 * More efficient than checking sections one by one
 *
 * @param sections - All course sections to check
 * @param currentCalendar - All events currently on calendar (personal + courses)
 * @param preferences - User's schedule preferences
 * @returns Array of conflict check results, one per section
 */
export async function checkAllSectionsConflicts(
  sections: CourseSectionWithMeetings[],
  currentCalendar: SchedulerEvent[],
  preferences: SchedulePreferences
): Promise<Array<{ section: CourseSectionWithMeetings; conflictCheck: SectionConflictCheck }>> {
  console.log('🔍 [checkAllSectionsConflicts] Starting batch conflict check:', {
    sectionCount: sections.length,
    calendarEventCount: currentCalendar.length,
  });

  const results = [];

  for (const section of sections) {
    const conflictCheck = await checkSectionConflicts(section, currentCalendar, preferences);
    results.push({
      section,
      conflictCheck,
    });
  }

  const conflictingSections = results.filter(r => r.conflictCheck.hasConflict).length;
  const clearSections = results.length - conflictingSections;

  console.log('✅ [checkAllSectionsConflicts] Batch check complete:', {
    total: results.length,
    withConflicts: conflictingSections,
    noConflicts: clearSections,
  });

  return results;
}

/**
 * Analyzes all sections for multiple courses - combines conflict checking and ranking
 * This is the primary tool for helping users choose course sections
 *
 * @param universityId - University ID
 * @param termName - Term name
 * @param courseCodes - Array of course codes to analyze
 * @param currentCalendar - User's existing calendar events
 * @param preferences - User's schedule preferences
 * @returns Comprehensive analysis for each course with ranked sections
 */
export async function analyzeCourseSections(
  universityId: number,
  termName: string,
  courseCodes: string[],
  currentCalendar: SchedulerEvent[],
  preferences: SchedulePreferences
): Promise<CourseAnalysis[]> {
  console.log('🔍 [analyzeCourseSections] Starting analysis:', {
    universityId,
    termName,
    courseCount: courseCodes.length,
    courses: courseCodes,
    calendarEventCount: currentCalendar.length,
  });

  const analyses: CourseAnalysis[] = [];

  for (const courseCode of courseCodes) {
    console.log(`📚 [analyzeCourseSections] Analyzing ${courseCode}...`);

    // Get all sections for this course
    const sections = await getCourseOfferingsForCourse(universityId, termName, courseCode);

    if (sections.length === 0) {
      console.warn(`⚠️ [analyzeCourseSections] No sections found for ${courseCode}`);
      analyses.push({
        courseCode,
        courseName: '',
        sections: [],
        bestSection: null,
        alternativeSections: [],
        allHaveConflicts: false,
      });
      continue;
    }

    // Analyze each section (conflicts + ranking)
    const analyzedSections: AnalyzedSection[] = [];
    for (const section of sections) {
      // Check conflicts
      const conflictCheck = await checkSectionConflicts(section, currentCalendar, preferences);

      // Rank section
      const ranked = await rankSectionsByPreferences([section], preferences);
      const ranking = ranked[0];

      // Adjust score based on conflicts
      let adjustedScore = ranking.score;
      if (conflictCheck.hasConflict) {
        const timeOverlapConflicts = conflictCheck.conflicts.filter(c => c.conflictType === 'time_overlap');
        if (timeOverlapConflicts.length > 0) {
          adjustedScore -= 30; // Major penalty for hard conflicts
        } else {
          adjustedScore -= 10; // Minor penalty for soft conflicts (back-to-back, etc.)
        }
      }

      analyzedSections.push({
        ...section,
        conflicts: conflictCheck,
        ranking: {
          score: Math.max(0, adjustedScore), // Don't go below 0
          originalScore: ranking.score,
          matchDetails: ranking.matchDetails,
          recommended: !conflictCheck.hasConflict && ranking.score >= 70,
        },
      });
    }

    // Sort by adjusted score (best first)
    analyzedSections.sort((a, b) => b.ranking.score - a.ranking.score);

    // Find best section (highest score with no conflicts)
    const bestSection = analyzedSections.find(s => !s.conflicts.hasConflict) || null;

    // Find alternatives (next 2 best sections without conflicts, or top 2 if all have conflicts)
    const alternativeSections = bestSection
      ? analyzedSections.filter(s => !s.conflicts.hasConflict && s !== bestSection).slice(0, 2)
      : analyzedSections.slice(0, 2);

    analyses.push({
      courseCode,
      courseName: sections[0].title || '',
      sections: analyzedSections,
      bestSection,
      alternativeSections,
      allHaveConflicts: analyzedSections.every(s => s.conflicts.hasConflict),
    });

    console.log(`✅ [analyzeCourseSections] ${courseCode} analyzed:`, {
      totalSections: analyzedSections.length,
      withConflicts: analyzedSections.filter(s => s.conflicts.hasConflict).length,
      bestSection: bestSection?.section_label || 'none',
    });
  }

  console.log('✅ [analyzeCourseSections] Analysis complete:', {
    coursesAnalyzed: analyses.length,
  });

  return analyses;
}

export interface AnalyzedSection extends CourseSectionWithMeetings {
  conflicts: SectionConflictCheck;
  ranking: {
    score: number; // Adjusted score (0-100) accounting for conflicts
    originalScore: number; // Original ranking score before conflict adjustment
    matchDetails: SectionMatchDetails;
    recommended: boolean; // True if no conflicts and score >= 70
  };
}

export interface CourseAnalysis {
  courseCode: string;
  courseName: string;
  sections: AnalyzedSection[];
  bestSection: AnalyzedSection | null; // Highest ranked section with no conflicts
  alternativeSections: AnalyzedSection[]; // Other good options
  allHaveConflicts: boolean; // True if every section has conflicts
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
  // Normalize all times to 24-hour format first
  const normalizedStart1 = normalizeTimeFormat(start1);
  const normalizedEnd1 = normalizeTimeFormat(end1);
  const normalizedStart2 = normalizeTimeFormat(start2);
  const normalizedEnd2 = normalizeTimeFormat(end2);

  const toMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const end1Min = toMinutes(normalizedEnd1);
  const start2Min = toMinutes(normalizedStart2);

  // If event1 ends before event2 starts
  if (end1Min <= start2Min) {
    return start2Min - end1Min;
  }

  // If event2 ends before event1 starts
  const end2Min = toMinutes(normalizedEnd2);
  const start1Min = toMinutes(normalizedStart1);
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
