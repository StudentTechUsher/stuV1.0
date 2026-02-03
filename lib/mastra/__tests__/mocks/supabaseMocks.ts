/**
 * Mock Supabase client and services for unit tests
 */

import { vi } from 'vitest';
import type { CourseSection } from '@/lib/services/courseOfferingService';

/**
 * Mock course sections for testing
 */
export const mockCourseSections: CourseSection[] = [
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

/**
 * Mock fetchCourseOfferingsForTerm service
 */
export const mockFetchCourseOfferingsForTerm = vi.fn(
  async (universityId: number, termName: string, courseCodes: string[]) => {
    // Return mock sections filtered by course code
    return mockCourseSections.filter((section) => courseCodes.includes(section.course_code));
  }
);

/**
 * Mock addCourseSelection service
 */
export const mockAddCourseSelection = vi.fn(async (scheduleId: string, selection: unknown) => {
  return {
    success: true,
    selectionId: 'mock-selection-id-' + Math.random(),
  };
});

/**
 * Reset all mocks
 */
export function resetMocks() {
  mockFetchCourseOfferingsForTerm.mockClear();
  mockAddCourseSelection.mockClear();
}
