/**
 * Unit Tests for Course Selection Tools (with Mocks)
 *
 * These tests use mocked Supabase data to validate the logic
 * without requiring a database connection.
 *
 * Run with: pnpm test lib/mastra/__tests__/courseSelectionTools.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  CourseSectionWithMeetings,
  SchedulerEvent,
} from '../types';
import type { SchedulePreferences } from '@/lib/services/scheduleService';
import {
  mockFetchCourseOfferingsForTerm,
  mockAddCourseSelection,
  mockCourseSections,
  resetMocks,
} from './mocks/supabaseMocks';

// Mock the service imports BEFORE importing the tools
vi.mock('@/lib/services/generateScheduleService', () => ({
  fetchCourseOfferingsForTerm: mockFetchCourseOfferingsForTerm,
}));

vi.mock('@/lib/services/scheduleService', () => ({
  addCourseSelection: mockAddCourseSelection,
}));

// Now import the tools (they will use the mocked services)
import {
  getCourseOfferingsForCourse,
  checkSectionConflicts,
  rankSectionsByPreferences,
  addCourseSelection,
} from '../tools/courseSelectionTools';

describe('getCourseOfferingsForCourse', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should fetch sections and parse meeting times', async () => {
    const sections = await getCourseOfferingsForCourse(1, 'Fall 2026', 'CS 450');

    expect(sections.length).toBe(3); // We have 3 mock sections
    expect(sections[0].course_code).toBe('CS 450');
    expect(sections[0].parsedMeetings).toBeDefined();
    expect(sections[0].parsedMeetings![0].daysOfWeek).toEqual([1, 3, 5]); // MWF
  });

  it('should parse meeting times correctly', async () => {
    const sections = await getCourseOfferingsForCourse(1, 'Fall 2026', 'CS 450');

    const section1 = sections[0];
    expect(section1.parsedMeetings![0]).toEqual({
      days: 'MWF',
      daysOfWeek: [1, 3, 5],
      startTime: '09:00',
      endTime: '10:00',
      location: 'Building A Room 101',
    });
  });
});

describe('checkSectionConflicts', () => {
  let mockSection: CourseSectionWithMeetings;
  let mockPreferences: SchedulePreferences;

  beforeEach(() => {
    mockSection = {
      offering_id: 1,
      course_code: 'CS 450',
      section_label: '001',
      title: 'Database Systems',
      credits_decimal: 3,
      meetings_json: null,
      instructor: 'Dr. Smith',
      seats_available: 10,
      seats_capacity: 30,
      waitlist_count: 0,
      term_name: 'Fall 2026',
      location_raw: 'Building A',
      parsedMeetings: [
        {
          days: 'MWF',
          daysOfWeek: [1, 3, 5],
          startTime: '09:00',
          endTime: '10:00',
          location: 'Building A Room 101',
        },
      ],
    };

    mockPreferences = {
      max_daily_hours: 6,
      lunch_break_required: false,
    };
  });

  describe('Time Overlap Detection', () => {
    it('should detect direct time overlap on same day', async () => {
      const calendar: SchedulerEvent[] = [
        {
          id: 'work-1',
          title: 'Work',
          dayOfWeek: 1, // Monday
          startTime: '09:30',
          endTime: '10:30',
          category: 'Work',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('time_overlap');
      expect(result.conflicts[0].message).toContain('Overlaps with Work');
    });

    it('should not detect conflict when times do not overlap', async () => {
      const calendar: SchedulerEvent[] = [
        {
          id: 'work-1',
          title: 'Work',
          dayOfWeek: 1, // Monday
          startTime: '10:30',
          endTime: '11:30',
          category: 'Work',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should not detect conflict on different days', async () => {
      const calendar: SchedulerEvent[] = [
        {
          id: 'work-1',
          title: 'Work',
          dayOfWeek: 2, // Tuesday (section is MWF)
          startTime: '09:00',
          endTime: '10:00',
          category: 'Work',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(false);
    });

    it('should handle section meeting on multiple days', async () => {
      const calendar: SchedulerEvent[] = [
        {
          id: 'event-wed',
          title: 'Club Meeting',
          dayOfWeek: 3, // Wednesday
          startTime: '09:15',
          endTime: '09:45',
          category: 'Club',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      // Should detect conflict on Wednesday
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].conflictingEvent.title).toBe('Club Meeting');
    });
  });

  describe('Back-to-Back Detection', () => {
    it('should detect back-to-back classes in different buildings', async () => {
      // Section ends at 10:00, next event starts at 10:05 (5 min gap)
      mockSection.parsedMeetings![0].location = 'Building A';

      const calendar: SchedulerEvent[] = [
        {
          id: 'class-2',
          title: 'MATH 215',
          dayOfWeek: 1,
          startTime: '10:05',
          endTime: '11:00',
          location: 'Building B', // Different building
          category: 'Course',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.some((c) => c.conflictType === 'back_to_back')).toBe(true);
      expect(result.conflicts[0].message).toContain('Back-to-back');
      expect(result.conflicts[0].message).toContain('5 min gap');
    });

    it('should not flag back-to-back in same building', async () => {
      mockSection.parsedMeetings![0].location = 'Building A';

      const calendar: SchedulerEvent[] = [
        {
          id: 'class-2',
          title: 'MATH 215',
          dayOfWeek: 1,
          startTime: '10:05',
          endTime: '11:00',
          location: 'Building A', // Same building
          category: 'Course',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      // Should not flag back-to-back (same building is OK)
      expect(result.conflicts.every((c) => c.conflictType !== 'back_to_back')).toBe(true);
    });

    it('should allow 15 min gap (sufficient time)', async () => {
      const calendar: SchedulerEvent[] = [
        {
          id: 'class-2',
          title: 'MATH 215',
          dayOfWeek: 1,
          startTime: '10:15',
          endTime: '11:00',
          location: 'Building B',
          category: 'Course',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.conflicts.every((c) => c.conflictType !== 'back_to_back')).toBe(true);
    });
  });

  describe('Daily Hour Limits', () => {
    it('should detect when adding section exceeds max_daily_hours', async () => {
      mockPreferences.max_daily_hours = 4; // 4 hours max per day

      // Already have 3.5 hours on Monday (2 classes)
      const calendar: SchedulerEvent[] = [
        {
          id: 'class-1',
          title: 'ENGL 102',
          dayOfWeek: 1,
          startTime: '11:00',
          endTime: '12:30',
          category: 'Course',
        },
        {
          id: 'class-2',
          title: 'HIST 201',
          dayOfWeek: 1,
          startTime: '13:00',
          endTime: '15:00',
          category: 'Course',
        },
      ];

      // Adding this section (1 hour) would make 4.5 hours total - exceeds 4
      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.some((c) => c.conflictType === 'exceeds_daily_hours')).toBe(true);
    });

    it('should allow section when under daily hour limit', async () => {
      mockPreferences.max_daily_hours = 6;

      const calendar: SchedulerEvent[] = [
        {
          id: 'class-1',
          title: 'ENGL 102',
          dayOfWeek: 1,
          startTime: '11:00',
          endTime: '12:30',
          category: 'Course',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.conflicts.every((c) => c.conflictType !== 'exceeds_daily_hours')).toBe(true);
    });
  });

  describe('Lunch Break Protection', () => {
    it('should detect when section blocks lunch time', async () => {
      mockPreferences.lunch_break_required = true;
      mockPreferences.lunch_start_time = '12:00';
      mockPreferences.lunch_end_time = '13:00';

      // Move section to 11:30-12:30 (overlaps with lunch)
      mockSection.parsedMeetings![0].startTime = '11:30';
      mockSection.parsedMeetings![0].endTime = '12:30';

      const result = await checkSectionConflicts(mockSection, [], mockPreferences);

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.some((c) => c.conflictType === 'blocks_lunch')).toBe(true);
      expect(result.conflicts[0].message).toContain('lunch time');
    });

    it('should allow section before lunch break', async () => {
      mockPreferences.lunch_break_required = true;
      mockPreferences.lunch_start_time = '12:00';
      mockPreferences.lunch_end_time = '13:00';

      // Section is 09:00-10:00 (before lunch)
      const result = await checkSectionConflicts(mockSection, [], mockPreferences);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Online/Async Courses', () => {
    it('should not flag conflicts for courses with no meeting times', async () => {
      mockSection.parsedMeetings = []; // Online/async course

      const calendar: SchedulerEvent[] = [
        {
          id: 'work-all-day',
          title: 'Work',
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '17:00',
          category: 'Work',
        },
      ];

      const result = await checkSectionConflicts(mockSection, calendar, mockPreferences);

      expect(result.hasConflict).toBe(false);
    });
  });
});

describe('rankSectionsByPreferences', () => {
  let mockPreferences: SchedulePreferences;
  let sections: CourseSectionWithMeetings[];

  beforeEach(() => {
    mockPreferences = {
      earliest_class_time: '08:00',
      latest_class_time: '17:00',
      preferred_days: [1, 3, 5], // MWF
      allow_waitlist: true,
      max_daily_hours: 6,
    };

    // Create test sections with parsed meetings
    sections = [
      {
        offering_id: 1,
        course_code: 'CS 450',
        section_label: '001',
        title: 'Database Systems',
        credits_decimal: 3,
        meetings_json: null,
        instructor: 'Dr. Smith',
        seats_available: 10,
        seats_capacity: 30,
        waitlist_count: 0,
        term_name: 'Fall 2026',
        location_raw: null,
        parsedMeetings: [
          { days: 'TTh', daysOfWeek: [2, 4], startTime: '14:00', endTime: '15:30' },
        ],
      },
      {
        offering_id: 2,
        course_code: 'CS 450',
        section_label: '002',
        title: 'Database Systems',
        credits_decimal: 3,
        meetings_json: null,
        instructor: 'Dr. Jones',
        seats_available: 15,
        seats_capacity: 30,
        waitlist_count: 0,
        term_name: 'Fall 2026',
        location_raw: null,
        parsedMeetings: [
          { days: 'MWF', daysOfWeek: [1, 3, 5], startTime: '09:00', endTime: '10:00' },
        ],
      },
    ];
  });

  it('should rank morning MWF section highest for morning + MWF preference', async () => {
    const ranked = await rankSectionsByPreferences(sections, mockPreferences);

    // Section 002 (MWF morning) should rank higher
    expect(ranked[0].section.section_label).toBe('002');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].matchDetails.timeMatch).toBe(true);
    expect(ranked[0].matchDetails.dayMatch).toBe(true);
  });

  it('should penalize waitlisted sections when allow_waitlist is false', async () => {
    mockPreferences.allow_waitlist = false;

    sections[0].waitlist_count = 5;
    sections[0].seats_available = 0;

    const ranked = await rankSectionsByPreferences(sections, mockPreferences);

    // Section with waitlist should rank lower
    expect(ranked[1].matchDetails.waitlistStatus).toBe('waitlisted');
    expect(ranked[1].matchDetails.cons.some((c) => c.includes('Waitlisted'))).toBe(true);
  });

  it('should provide clear pros and cons', async () => {
    const ranked = await rankSectionsByPreferences(sections, mockPreferences);

    const topSection = ranked[0];
    expect(topSection.matchDetails.pros.length).toBeGreaterThan(0);
    expect(topSection.matchDetails.pros.some((p) => p.includes('MWF'))).toBe(true);
    expect(topSection.matchDetails.pros.some((p) => p.includes('Seats available'))).toBe(true);
  });

  it('should handle online/async courses neutrally', async () => {
    const onlineSection: CourseSectionWithMeetings = {
      offering_id: 3,
      course_code: 'CS 450',
      section_label: 'ONLINE',
      title: 'Database Systems',
      credits_decimal: 3,
      meetings_json: null,
      instructor: 'Dr. Smith',
      seats_available: 10,
      seats_capacity: 30,
      waitlist_count: 0,
      term_name: 'Fall 2026',
      location_raw: null,
      parsedMeetings: [], // No meetings = online/async
    };

    const ranked = await rankSectionsByPreferences([onlineSection], mockPreferences);

    expect(ranked[0].score).toBe(50); // Neutral score
    expect(ranked[0].matchDetails.pros).toContain('Online/Async course');
  });

  it('should sort sections by score descending', async () => {
    const ranked = await rankSectionsByPreferences(sections, mockPreferences);

    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
    }
  });
});

describe('addCourseSelection', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should save course selection and return success', async () => {
    const result = await addCourseSelection({
      scheduleId: 'schedule-123',
      courseCode: 'CS 450',
      primaryOfferingId: 1,
      backup1OfferingId: 2,
      backup2OfferingId: 3,
      isWaitlisted: false,
    });

    expect(result.success).toBe(true);
    expect(result.selectionId).toBeDefined();
    expect(mockAddCourseSelection).toHaveBeenCalledTimes(1);
  });

  it('should mark selection as waitlisted when appropriate', async () => {
    await addCourseSelection({
      scheduleId: 'schedule-123',
      courseCode: 'CS 450',
      primaryOfferingId: 2, // This section is waitlisted in our mocks
      backup1OfferingId: 1,
      backup2OfferingId: 3,
      isWaitlisted: true,
    });

    const callArgs = mockAddCourseSelection.mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      status: 'waitlisted',
    });
  });
});
