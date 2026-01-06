/**
 * GPA Calculation Service
 * Utility functions for calculating GPA from course data
 */

import { computeTotalsFromTranscript } from '@/lib/gpa/core';
import type { GradeKey } from '@/lib/gpa/gradeScale';
import type { ParsedCourse } from './userCoursesService';
import { logInfo, logError } from '@/lib/logger';

/**
 * AUTHORIZATION: INTERNAL USE ONLY
 * Calculates GPA from an array of parsed courses
 * Filters out non-letter grades (P/NP/W/AU/In Progress)
 * @param courses - Array of parsed courses from user_courses
 * @returns Calculated GPA or null if no gradeable courses
 */
export function calculateGpaFromCourses(courses: ParsedCourse[]): number | null {
  try {
    // Filter to only completed courses with letter grades
    const completedCourses = courses.filter((course): course is ParsedCourse & { grade: string; credits: number } => {
      if (!course.grade || course.credits === null || course.credits === undefined) {
        return false;
      }

      const gradeUpper = course.grade.toUpperCase();

      // Exclude non-letter grades
      const excludedGrades = ['P', 'NP', 'W', 'AU', 'IN PROGRESS', 'I', 'NC', 'T', 'CR'];
      if (excludedGrades.includes(gradeUpper)) {
        return false;
      }

      // Only include courses with credits > 0
      if (typeof course.credits !== 'number' || course.credits <= 0) {
        return false;
      }

      return true;
    });

    // Check if we have any gradeable courses
    if (completedCourses.length === 0) {
      logInfo('No gradeable courses found for GPA calculation', {
        action: 'calculate_gpa_from_courses',
        count: courses.length,
      });
      return null;
    }

    // Map to format expected by computeTotalsFromTranscript
    const gradeRows = completedCourses.map((course) => ({
      credits: course.credits,
      grade: course.grade.toUpperCase() as GradeKey,
    }));

    // Use existing GPA calculation logic
    const { currentGpa } = computeTotalsFromTranscript(gradeRows);

    logInfo('Successfully calculated GPA from courses', {
      action: 'calculate_gpa_from_courses',
      count: completedCourses.length,
    });

    return currentGpa;
  } catch (error) {
    logError('Failed to calculate GPA from courses', error, {
      action: 'calculate_gpa_from_courses',
    });
    return null;
  }
}
