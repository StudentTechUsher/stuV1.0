'use client';

import { useState, useEffect, useCallback } from 'react';
import { CourseRow, SectionOption, InstructorOption } from '@/types/schedule';
import { mockSemesterSchedule, mockSectionOptions } from '@/lib/mocks/semesterSchedule';
import { calculateTotalCredits, calculateScheduleDifficulty } from '@/lib/utils/creditMath';

interface UseSemesterScheduleReturn {
  rows: CourseRow[];
  totalCredits: number;
  scheduleDifficulty?: number;
  sectionOptionsMap: Record<string, SectionOption[]>;
  instructorOptionsMap: Record<string, InstructorOption[]>;
  isLoading: boolean;
  error: Error | null;
  changeSection: (courseId: string, newSectionId: string) => Promise<void>;
  withdraw: (courseId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage semester schedule data and mutations
 *
 * @param studentId - The student's ID
 * @param term - The term identifier (e.g., "2025-winter")
 * @returns Schedule data and mutation functions
 */
export function useSemesterSchedule(
  studentId?: string,
  term?: string
): UseSemesterScheduleReturn {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [sectionOptionsMap, setSectionOptionsMap] = useState<Record<string, SectionOption[]>>({});
  const [instructorOptionsMap, setInstructorOptionsMap] = useState<Record<string, InstructorOption[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    if (!studentId || !term) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/semester-schedule?studentId=${studentId}&term=${term}`);
      // if (!response.ok) throw new Error('Failed to fetch schedule');
      // const data = await response.json();

      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      const scheduleData = mockSemesterSchedule;
      setRows(scheduleData);

      // Build section options map
      const sectionsMap: Record<string, SectionOption[]> = {};
      const instructorsMap: Record<string, InstructorOption[]> = {};

      scheduleData.forEach(course => {
        // Get section options for this course
        sectionsMap[course.id] = mockSectionOptions[course.id] || [];

        // Build instructor options from section options
        const uniqueInstructors = new Map<string, InstructorOption>();
        (mockSectionOptions[course.id] || []).forEach(section => {
          if (!uniqueInstructors.has(section.instructorId)) {
            uniqueInstructors.set(section.instructorId, {
              instructorId: section.instructorId,
              instructorName: section.instructorName,
              instructorRating: section.instructorRating,
              sectionId: section.sectionId,
              section: section.section,
              meeting: section.meeting,
            });
          }
        });
        instructorsMap[course.id] = Array.from(uniqueInstructors.values());
      });

      setSectionOptionsMap(sectionsMap);
      setInstructorOptionsMap(instructorsMap);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [studentId, term]);

  // Initial fetch
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Change section mutation
  const changeSection = useCallback(async (courseId: string, newSectionId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/semester-schedule/change-section', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ courseId, newSectionId }),
      // });
      // if (!response.ok) throw new Error('Failed to change section');
      // const updatedRow = await response.json();

      // For now, update optimistically with mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      setRows(prevRows => {
        return prevRows.map(row => {
          if (row.id === courseId) {
            // Find the new section data
            const newSection = mockSectionOptions[courseId]?.find(
              s => s.sectionId === newSectionId
            );

            if (!newSection) return row;

            // Update the row with new section data
            return {
              ...row,
              section: newSection.section,
              instructorId: newSection.instructorId,
              instructorName: newSection.instructorName,
              instructorRating: newSection.instructorRating,
              meeting: newSection.meeting,
              location: newSection.location,
            };
          }
          return row;
        });
      });

      // Show success toast (if you have a toast system)
      console.log('Section changed successfully');
    } catch (err) {
      console.error('Error changing section:', err);
      throw err;
    }
  }, []);

  // Withdraw mutation
  const withdraw = useCallback(async (courseId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/semester-schedule/withdraw', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ courseId }),
      // });
      // if (!response.ok) throw new Error('Failed to withdraw from course');

      // For now, remove optimistically
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      setRows(prevRows => prevRows.filter(row => row.id !== courseId));

      // Show success toast
      console.log('Withdrawn from course successfully');
    } catch (err) {
      console.error('Error withdrawing from course:', err);
      throw err;
    }
  }, []);

  const totalCredits = calculateTotalCredits(rows);
  const scheduleDifficulty = calculateScheduleDifficulty(rows);

  return {
    rows,
    totalCredits,
    scheduleDifficulty,
    sectionOptionsMap,
    instructorOptionsMap,
    isLoading,
    error,
    changeSection,
    withdraw,
    refetch: fetchSchedule,
  };
}
