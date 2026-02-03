/**
 * Unit Tests for Course Selection Orchestrator
 *
 * Tests the state machine and course-by-course flow logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CourseSelectionSessionInput } from '../types';

// Mock data (must be defined before vi.mock calls)
const mockCourseSections = [
  {
    offering_id: 1,
    course_code: 'CS 450',
    title: 'Database Systems',
    credits_decimal: 3,
    description: 'Introduction to database systems',
    department_code: 'CS',
    prerequisites: 'CS 240',
    section_label: '001',
    instructor: 'Dr. Smith',
    meetings_json: {
      days: 'MWF',
      start: '09:00',
      end: '10:00',
      location: 'Building A Room 101',
    },
    seats_available: 12,
    seats_capacity: 30,
    waitlist_count: 0,
    term_name: 'Fall 2026',
    location_raw: 'Building A Room 101',
  },
  {
    offering_id: 2,
    course_code: 'CS 450',
    title: 'Database Systems',
    credits_decimal: 3,
    description: 'Introduction to database systems',
    department_code: 'CS',
    prerequisites: 'CS 240',
    section_label: '002',
    instructor: 'Dr. Jones',
    meetings_json: {
      days: 'TTh',
      start: '14:00',
      end: '15:30',
      location: 'Building B Room 205',
    },
    seats_available: 0,
    seats_capacity: 30,
    waitlist_count: 5,
    term_name: 'Fall 2026',
    location_raw: 'Building B Room 205',
  },
  {
    offering_id: 3,
    course_code: 'CS 450',
    title: 'Database Systems',
    credits_decimal: 3,
    description: 'Introduction to database systems',
    department_code: 'CS',
    prerequisites: 'CS 240',
    section_label: '003',
    instructor: 'Dr. Brown',
    meetings_json: {
      days: 'MWF',
      start: '11:00',
      end: '12:00',
      location: 'Building A Room 101',
    },
    seats_available: 5,
    seats_capacity: 30,
    waitlist_count: 0,
    term_name: 'Fall 2026',
    location_raw: 'Building A Room 101',
  },
];

// Mock the service imports with factory functions
vi.mock('@/lib/services/generateScheduleService', () => ({
  fetchCourseOfferingsForTerm: vi.fn(async (universityId, termName, courseCodes) => {
    // Return mock sections filtered by course code
    return mockCourseSections.filter((section) => courseCodes.includes(section.course_code));
  }),
}));

vi.mock('@/lib/services/scheduleService', () => ({
  addCourseSelection: vi.fn(async (scheduleId, selection) => {
    return {
      success: true,
      selectionId: 'mock-selection-id-' + Math.random(),
    };
  }),
}));

// Import after mocks are set up
import { CourseSelectionOrchestrator } from '../courseSelectionOrchestrator';
import { fetchCourseOfferingsForTerm } from '@/lib/services/generateScheduleService';
import { addCourseSelection } from '@/lib/services/scheduleService';

// Get mocked functions for assertions
const mockFetchCourseOfferingsForTerm = vi.mocked(fetchCourseOfferingsForTerm);
const mockAddCourseSelection = vi.mocked(addCourseSelection);

describe('CourseSelectionOrchestrator', () => {
  let orchestrator: CourseSelectionOrchestrator;
  let sessionInput: CourseSelectionSessionInput;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup session input
    sessionInput = {
      scheduleId: 'schedule-123',
      studentId: 456,
      universityId: 1,
      termName: 'Fall 2026',
      gradPlanCourses: ['CS 450', 'MATH 215'],
      preferences: {
        earliest_class_time: '08:00',
        latest_class_time: '17:00',
        preferred_days: [1, 3, 5], // MWF
        allow_waitlist: true,
        max_daily_hours: 6,
      },
      existingCalendar: [], // No personal events
    };

    orchestrator = new CourseSelectionOrchestrator(sessionInput);
  });

  describe('Initialization', () => {
    it('should initialize with correct state', () => {
      const state = orchestrator.getState();

      expect(state.currentCourseIndex).toBe(0);
      expect(state.totalCourses).toBe(2);
      expect(state.coursesCompleted).toEqual([]);
      expect(state.calendarEvents).toEqual([]);
    });

    it('should return welcome message on start', async () => {
      const message = await orchestrator.start();

      expect(message.text).toContain('Hi! I\'m your course scheduling assistant');
      expect(message.text).toContain('2 courses');
      expect(message.text).toContain('Fall 2026');
      expect(message.options).toBeDefined();
      expect(message.options![0].value).toBe('start');
    });
  });

  describe('Course Processing Flow', () => {
    it('should fetch and rank sections when user starts', async () => {
      await orchestrator.start();

      // User clicks "Let's go!"
      const response = await orchestrator.processUserInput('start');

      expect(response.text).toContain('CS 450');
      expect(response.sectionCards).toBeDefined();
      expect(response.sectionCards!.length).toBeGreaterThan(0);
      expect(mockFetchCourseOfferingsForTerm).toHaveBeenCalledWith(1, 'Fall 2026', ['CS 450']);
    });

    it('should allow selecting a section', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Select section with offering_id 1
      const response = await orchestrator.processUserInput({ sectionId: 1 });

      // Should move to backup selection
      expect(response.text).toContain('backup');
    });

    it('should handle waitlist confirmation flow', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Select waitlisted section (offering_id 2)
      const response1 = await orchestrator.processUserInput({ sectionId: 2 });

      // Should ask for waitlist confirmation
      expect(response1.text).toContain('waitlisted');
      expect(response1.options).toBeDefined();

      // Accept waitlist
      const response2 = await orchestrator.processUserInput({ action: 'yes' });

      // Should move to backup selection
      expect(response2.text).toContain('backup');
    });

    it('should reject waitlist and show other sections', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Select waitlisted section
      await orchestrator.processUserInput({ sectionId: 2 });

      // Reject waitlist
      const response = await orchestrator.processUserInput({ action: 'no' });

      // Should show sections again
      expect(response.text).toContain('CS 450');
      expect(response.sectionCards).toBeDefined();
    });

    it('should complete full course selection with backups', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Select primary (section 1)
      await orchestrator.processUserInput({ sectionId: 1 });

      // Select backup 1 (section 2)
      await orchestrator.processUserInput({ sectionId: 2 });

      // Select backup 2 (section 3)
      const response = await orchestrator.processUserInput({ sectionId: 3 });

      // Should confirm course scheduled
      expect(response.text).toContain('CS 450');
      expect(response.text).toContain('scheduled');
      expect(mockAddCourseSelection).toHaveBeenCalledTimes(1);

      // Should have saved with correct data
      const saveCall = mockAddCourseSelection.mock.calls[0];
      expect(saveCall[0]).toBe('schedule-123');
      expect(saveCall[1]).toMatchObject({
        course_code: 'CS 450',
        primary_offering_id: 1,
        backup_1_offering_id: 2,
        backup_2_offering_id: 3,
        status: 'planned',
      });
    });

    it('should add course to calendar after saving', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Complete full flow
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      // Calendar should be updated
      const calendarEvents = orchestrator.getCalendarEvents();
      expect(calendarEvents.length).toBeGreaterThan(0);
      expect(calendarEvents[0].courseCode).toBe('CS 450');
      expect(calendarEvents[0].category).toBe('Course');
    });

    it('should move to next course after completing one', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Complete first course
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      // Get state
      const state = orchestrator.getState();
      expect(state.coursesCompleted).toContain('CS 450');
      expect(state.currentCourseIndex).toBe(1); // Moved to next course
    });
  });

  describe('Progress Tracking', () => {
    it('should show correct progress indicator', async () => {
      const progress1 = orchestrator.getProgressIndicator();
      expect(progress1).toContain('Course 1 of 2');
      expect(progress1).toContain('CS 450');

      // Complete first course
      await orchestrator.start();
      await orchestrator.processUserInput('start');
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      const progress2 = orchestrator.getProgressIndicator();
      expect(progress2).toContain('Course 2 of 2');
    });

    it('should track completed courses', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      const state = orchestrator.getState();
      expect(state.coursesCompleted).toEqual(['CS 450']);
      expect(state.coursesCompleted.length).toBe(1);
    });
  });

  describe('State Machine Transitions', () => {
    it('should enforce correct phase transitions', async () => {
      const message1 = await orchestrator.start();
      expect(message1.options![0].value).toBe('start');

      // Start -> fetching -> awaiting_primary
      const message2 = await orchestrator.processUserInput('start');
      expect(message2.sectionCards).toBeDefined(); // In awaiting_primary

      // awaiting_primary -> awaiting_backup_1
      const message3 = await orchestrator.processUserInput({ sectionId: 1 });
      expect(message3.text).toContain('backup');
      expect(message3.text).toContain('#1');

      // awaiting_backup_1 -> awaiting_backup_2
      const message4 = await orchestrator.processUserInput({ sectionId: 2 });
      expect(message4.text).toContain('backup');
      expect(message4.text).toContain('#2');

      // awaiting_backup_2 -> saving -> course_complete
      const message5 = await orchestrator.processUserInput({ sectionId: 3 });
      expect(message5.text).toContain('scheduled');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty course list', async () => {
      const emptyInput: CourseSelectionSessionInput = {
        ...sessionInput,
        gradPlanCourses: [],
      };

      const emptyOrchestrator = new CourseSelectionOrchestrator(emptyInput);
      await emptyOrchestrator.start();

      const response = await emptyOrchestrator.processUserInput('start');

      // Should complete immediately with no courses
      expect(response.text).toContain('All done');
    });

    it('should handle skip course', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      const response = await orchestrator.skipCurrentCourse();

      // Should mark as skipped and move to next
      const state = orchestrator.getState();
      expect(state.coursesCompleted).toContain('CS 450 (skipped)');
    });

    it('should reset to initial state', async () => {
      // Complete a course
      await orchestrator.start();
      await orchestrator.processUserInput('start');
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      // Reset
      orchestrator.reset();

      const state = orchestrator.getState();
      expect(state.currentCourseIndex).toBe(0);
      expect(state.coursesCompleted).toEqual([]);
      expect(state.calendarEvents).toEqual([]);
    });
  });

  describe('Calendar Integration', () => {
    it('should start with existing calendar events', () => {
      const inputWithEvents: CourseSelectionSessionInput = {
        ...sessionInput,
        existingCalendar: [
          {
            id: 'work-1',
            title: 'Work',
            dayOfWeek: 1,
            startTime: '14:00',
            endTime: '17:00',
            category: 'Work',
          },
        ],
      };

      const orchestratorWithEvents = new CourseSelectionOrchestrator(inputWithEvents);
      const events = orchestratorWithEvents.getCalendarEvents();

      expect(events.length).toBe(1);
      expect(events[0].title).toBe('Work');
    });

    it('should add selected courses to calendar', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');
      await orchestrator.processUserInput({ sectionId: 1 }); // MWF 9-10am
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      const events = orchestrator.getCalendarEvents();

      // Should have events for M, W, F
      const courseEvents = events.filter((e) => e.category === 'Course');
      expect(courseEvents.length).toBe(3); // Mon, Wed, Fri
      expect(courseEvents.every((e) => e.courseCode === 'CS 450')).toBe(true);
    });

    it('should preserve calendar across course selections', async () => {
      await orchestrator.start();

      // Complete first course
      await orchestrator.processUserInput('start');
      await orchestrator.processUserInput({ sectionId: 1 });
      await orchestrator.processUserInput({ sectionId: 2 });
      await orchestrator.processUserInput({ sectionId: 3 });

      const eventsAfterFirst = orchestrator.getCalendarEvents();

      // Start second course
      await orchestrator.processUserInput('start');

      const eventsBeforeSecond = orchestrator.getCalendarEvents();

      // Should preserve first course events
      expect(eventsBeforeSecond.length).toBe(eventsAfterFirst.length);
    });
  });

  describe('Section Filtering', () => {
    it('should not show already selected sections in backups', async () => {
      await orchestrator.start();
      await orchestrator.processUserInput('start');

      // Select primary
      const backup1Response = await orchestrator.processUserInput({ sectionId: 1 });

      // Backup options should not include section 1
      expect(backup1Response.sectionCards).toBeDefined();
      const hasSection1 = backup1Response.sectionCards!.some((card) => card.section.offering_id === 1);
      expect(hasSection1).toBe(false);
    });

    it('should filter out conflicting sections', async () => {
      // Add a conflicting personal event
      const inputWithConflict: CourseSelectionSessionInput = {
        ...sessionInput,
        existingCalendar: [
          {
            id: 'work-1',
            title: 'Work',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '10:00',
            category: 'Work',
          },
        ],
      };

      const orchestratorWithConflict = new CourseSelectionOrchestrator(inputWithConflict);
      await orchestratorWithConflict.start();

      const response = await orchestratorWithConflict.processUserInput('start');

      // Section 1 (MWF 9-10am) should be filtered out due to conflict
      expect(response.sectionCards).toBeDefined();
      const hasConflictingSection = response.sectionCards!.some(
        (card) => card.section.offering_id === 1
      );
      expect(hasConflictingSection).toBe(false);
    });
  });
});
