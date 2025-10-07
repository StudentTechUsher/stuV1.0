import { CourseRow, RequirementTag, DayOfWeek, SectionOption, InstructorOption } from '@/types/schedule';
import { SchedulerEvent } from '@/components/scheduler/scheduler-calendar';

/**
 * Convert SchedulerEvents to CourseRows for the details table
 * Groups events by course_code and section
 */
export function convertSchedulerEventsToCourseRows(events: SchedulerEvent[]): CourseRow[] {
  // Filter only class events
  const classEvents = events.filter(e => e.type === 'class');

  // Group by course_code + section
  const courseMap = new Map<string, SchedulerEvent[]>();

  classEvents.forEach(event => {
    if (event.course_code && event.section) {
      const key = `${event.course_code}-${event.section}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, []);
      }
      courseMap.get(key)!.push(event);
    }
  });

  // Convert each group to a CourseRow
  const rows: CourseRow[] = [];

  courseMap.forEach((courseEvents, key) => {
    const firstEvent = courseEvents[0];

    // Extract days from all events for this course
    const days = courseEvents
      .map(e => dayOfWeekToAbbreviation(e.dayOfWeek))
      .filter((day): day is DayOfWeek => day !== null);

    // Use the first event's times (they should all be the same)
    const startTime = firstEvent.startTime;
    const endTime = firstEvent.endTime;

    // Parse requirement tag
    const requirementTags = firstEvent.requirement
      ? [parseRequirementTag(firstEvent.requirement)]
      : [];

    // Extract location parts
    const location = parseLocation(firstEvent.location || '');

    rows.push({
      id: key,
      code: firstEvent.course_code || '',
      title: extractCourseTitle(firstEvent.title), // Extract title from event
      section: firstEvent.section || '',
      difficulty: undefined, // Not available in SchedulerEvent
      instructorId: generateInstructorId(firstEvent.professor || ''),
      instructorName: firstEvent.professor || 'TBA',
      instructorRating: undefined,
      meeting: {
        days: days.sort((a, b) => dayOrder(a) - dayOrder(b)),
        start: startTime,
        end: endTime,
      },
      location,
      credits: firstEvent.credits || 3.0,
      requirementTags,
      description: undefined,
      prereqs: [],
      seats: undefined,
      attributes: [],
      actions: {
        withdrawable: true,
      },
    });
  });

  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Convert dayOfWeek number to DayOfWeek abbreviation
 */
function dayOfWeekToAbbreviation(dayOfWeek: number): DayOfWeek | null {
  const map: Record<number, DayOfWeek> = {
    1: 'M',
    2: 'Tu',
    3: 'W',
    4: 'Th',
    5: 'F',
  };
  return map[dayOfWeek] || null;
}

/**
 * Get day order for sorting
 */
function dayOrder(day: DayOfWeek): number {
  const order: Record<DayOfWeek, number> = {
    M: 1,
    Tu: 2,
    W: 3,
    Th: 4,
    F: 5,
  };
  return order[day];
}

/**
 * Parse requirement string to RequirementTag
 */
function parseRequirementTag(requirement: string): { type: RequirementTag; weight?: number } {
  const normalized = requirement.toUpperCase();

  if (normalized.includes('MAJOR')) {
    return { type: 'MAJOR', weight: extractWeight(requirement) };
  }
  if (normalized.includes('MINOR')) {
    return { type: 'MINOR', weight: extractWeight(requirement) };
  }
  if (normalized.includes('GE') || normalized.includes('GENERAL')) {
    return { type: 'GE', weight: extractWeight(requirement) };
  }
  if (normalized.includes('REL') || normalized.includes('RELIGION')) {
    return { type: 'REL', weight: extractWeight(requirement) };
  }
  return { type: 'ELECTIVE', weight: extractWeight(requirement) };
}

/**
 * Extract weight number from requirement string if present
 */
function extractWeight(requirement: string): number | undefined {
  const match = requirement.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : undefined;
}

/**
 * Parse location string into building and room
 */
function parseLocation(location: string): { building: string; room?: string } {
  if (!location || location === 'TBA') {
    return { building: 'TBA' };
  }

  // Try to split on common patterns like "TMCB 1170" or "232 TNRB"
  const parts = location.trim().split(/\s+/);

  if (parts.length >= 2) {
    // Check if first part is a number (room number first format)
    if (/^\d+$/.test(parts[0])) {
      return {
        building: parts.slice(1).join(' '),
        room: parts[0],
      };
    }
    // Building name first format
    return {
      building: parts[0],
      room: parts.slice(1).join(' '),
    };
  }

  return { building: location };
}

/**
 * Extract course title from event title
 * Event title is usually just the course code
 * Returns the title as-is since we'll look it up from the courses array in the parent
 */
function extractCourseTitle(title: string): string {
  return title;
}

/**
 * Generate a consistent instructor ID from name
 */
function generateInstructorId(name: string): string {
  return `inst-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Generate mock section options for a course
 * In a real app, this would come from an API
 */
export function generateMockSectionOptions(
  courseRow: CourseRow
): SectionOption[] {
  // For now, just return the current section as the only option
  // In a real implementation, you'd fetch alternative sections from an API
  return [
    {
      sectionId: courseRow.id,
      section: courseRow.section,
      instructorId: courseRow.instructorId,
      instructorName: courseRow.instructorName,
      instructorRating: courseRow.instructorRating,
      meeting: courseRow.meeting,
      location: courseRow.location,
      seats: {
        capacity: 45,
        open: 12,
        waitlist: 0,
      },
    },
  ];
}

/**
 * Generate mock instructor options for a course
 */
export function generateMockInstructorOptions(courseRow: CourseRow): InstructorOption[] {
  // For now, just return the current instructor
  // In a real implementation, you'd fetch alternative instructors from an API
  return [
    {
      instructorId: courseRow.instructorId,
      instructorName: courseRow.instructorName,
      instructorRating: courseRow.instructorRating,
      sectionId: courseRow.id,
      section: courseRow.section,
      meeting: courseRow.meeting,
    },
  ];
}
