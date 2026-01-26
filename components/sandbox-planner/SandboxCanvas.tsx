'use client';

import React, { useCallback } from 'react';
import { Course, SemesterLane } from './types';
import { SemesterLane as SemesterLaneComponent } from './SemesterLane';

export interface SandboxCanvasProps {
  semesters: SemesterLane[];
  onSemesterChange: (semesters: SemesterLane[]) => void;
  onCourseSelect: (course: Course | null) => void;
  onAddSemester: () => void;
  onDeleteSemester: (semesterId: string) => void;
}

/**
 * SandboxCanvas: Main planning area with semester lanes and drag-drop support
 * Manages DnD context and handles course placement/reordering
 */
export function SandboxCanvas({
  semesters,
  onSemesterChange,
  onCourseSelect,
  onAddSemester,
  onDeleteSemester,
}: SandboxCanvasProps) {

  /**
   * Handle remove course from a semester
   */
  const handleRemoveCourse = useCallback(
    (courseId: string, semesterId: string) => {
      const updatedSemesters = semesters.map((sem) => {
        if (sem.id === semesterId) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c.id !== courseId),
          };
        }
        return sem;
      });

      onSemesterChange(updatedSemesters);
    },
    [semesters, onSemesterChange]
  );

  /**
   * Handle course selection
   */
  const handleCourseSelect = useCallback(
    (course: Course) => {
      onCourseSelect(course);
    },
    [onCourseSelect]
  );

  /**
   * Build a map of course objects for each semester
   */
  const semesterCoursesMap = semesters.reduce(
    (acc, sem) => {
      acc[sem.id] = sem.courses;
      return acc;
    },
    {} as Record<string, Course[]>
  );

  return (
    <div className="flex-1 overflow-visible bg-muted/10">
      <div className="p-6 h-full flex flex-col overflow-auto">
        {/* Semesters grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
          {semesters.map((semester) => (
            <SemesterLaneComponent
              key={semester.id}
              semester={semester}
              courses={semesterCoursesMap[semester.id] || []}
              isEditMode={true}
              onTermChange={(newTerm) => {
                const updated = semesters.map((s) =>
                  s.id === semester.id ? { ...s, term: newTerm } : s
                );
                onSemesterChange(updated);
              }}
              onDeleteSemester={() => onDeleteSemester(semester.id)}
              onCourseSelect={handleCourseSelect}
              onRemoveCourse={(courseId) =>
                handleRemoveCourse(courseId, semester.id)
              }
            />
          ))}
        </div>

        {/* Add semester button */}
        <button
          onClick={onAddSemester}
          className="mt-8 mx-auto px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-background font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Semester
        </button>
      </div>
    </div>
  );
}
