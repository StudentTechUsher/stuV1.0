'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Course, CourseFilters, SemesterLane, StudentProfile } from './types';
import { PlannerToolbar } from './PlannerToolbar';
import { CoursesPanel } from './CoursesPanel';
import { SandboxCanvas } from './SandboxCanvas';
import { CourseDetailsDrawer } from './CourseDetailsDrawer';

export interface SandboxPlannerProps {
  studentId: string;
  remainingCourses: Course[];
  studentProfile: StudentProfile;
  existingPlan?: SemesterLane[];
  onSavePlan?: (semesters: SemesterLane[]) => Promise<void>;
}

/**
 * SandboxPlanner: Main graduation planning canvas component.
 * Combines a free-form semester planning interface with course management.
 * Features drag-drop course placement, filtering, and real-time feedback.
 */
export function SandboxPlanner({
  studentId,
  remainingCourses,
  studentProfile,
  existingPlan,
  onSavePlan,
}: SandboxPlannerProps) {
  // Semester lanes (the main canvas)
  const [semesters, setSemesters] = useState<SemesterLane[]>(
    existingPlan || initializeDefaultSemesters(studentProfile)
  );

  // Unplaced courses in left panel
  const [unplacedCourses, setUnplacedCourses] = useState<Course[]>(remainingCourses);

  // Filters for left panel
  const [filters, setFilters] = useState<CourseFilters>({
    requirementType: [],
    creditRange: [0, 6],
    searchTerm: '',
  });

  // Details drawer state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Save state
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mobile sidebar toggle
  const [isMobileCoursePanelOpen, setIsMobileCoursePanelOpen] = useState(false);

  // Track currently dragging course for overlay
  const [activeDraggingCourse, setActiveDraggingCourse] = useState<Course | null>(null);

  /**
   * Filter courses in left panel based on current filters
   */
  const filteredCourses = useMemo(() => {
    return unplacedCourses.filter((course) => {
      // Requirement type filter
      if (
        filters.requirementType.length > 0 &&
        !filters.requirementType.includes(course.requirement || 'Elective')
      ) {
        return false;
      }

      // Credits filter
      if (
        course.credits < filters.creditRange[0] ||
        course.credits > filters.creditRange[1]
      ) {
        return false;
      }

      // Search filter
      if (filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase();
        return (
          course.code.toLowerCase().includes(term) ||
          course.title.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [unplacedCourses, filters]);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    })
  );

  /**
   * Handle drag start: track which course is being dragged
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current as { course?: Course } | undefined;
    if (activeData?.course) {
      setActiveDraggingCourse(activeData.course);
    }
  }, []);

  /**
   * Handle drag end: move course from unplaced/semester to target semester
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Clear the dragging course
      setActiveDraggingCourse(null);

      if (!over) return;

      const activeData = active.data.current as { course?: Course } | undefined;
      if (!activeData?.course) return;

      const { course } = activeData;
      const overIdStr = over.id.toString();
      const targetSemesterId = overIdStr.startsWith('semester-')
        ? overIdStr.replace('semester-', '')
        : null;

      if (!targetSemesterId) return;

      // Find which semester the course is coming from (if any)
      let sourceSemesterId: string | null = null;
      for (const sem of semesters) {
        if (sem.courses.some((c) => c.id === course.id)) {
          sourceSemesterId = sem.id;
          break;
        }
      }

      // If dropping in the same semester, do nothing
      if (sourceSemesterId === targetSemesterId) return;

      // Move course: remove from source (if exists in semester) and add to target
      const updatedSemesters = semesters.map((sem) => {
        // Remove from source semester
        if (sem.id === sourceSemesterId) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c.id !== course.id),
          };
        }

        // Add to target semester
        if (sem.id === targetSemesterId) {
          const alreadyExists = sem.courses.some((c) => c.id === course.id);
          if (!alreadyExists) {
            return {
              ...sem,
              courses: [...sem.courses, course],
            };
          }
        }

        return sem;
      });

      // Also remove from unplaced if it was there
      const updatedUnplaced = unplacedCourses.filter((c) => c.id !== course.id);

      setSemesters(updatedSemesters);
      setUnplacedCourses(updatedUnplaced);
      setIsDirty(true);
    },
    [semesters, unplacedCourses]
  );

  /**
   * Handle course drag-drop: move from unplaced to semester or vice versa
   */
  const handleSemesterChange = useCallback((updatedSemesters: SemesterLane[]) => {
    setSemesters(updatedSemesters);
    setIsDirty(true);

    // Recalculate unplaced courses (courses not in any semester)
    const allPlacedCourseIds = new Set<string>();
    updatedSemesters.forEach((sem) => {
      sem.courses.forEach((course) => {
        allPlacedCourseIds.add(course.id);
      });
    });

    const newUnplaced = remainingCourses.filter(
      (course) => !allPlacedCourseIds.has(course.id)
    );
    setUnplacedCourses(newUnplaced);
  }, [remainingCourses]);

  /**
   * Handle course selection to open details drawer
   */
  const handleCourseSelect = useCallback((course: Course | null) => {
    setSelectedCourse(course);
    if (course) {
      setIsDrawerOpen(true);
    }
  }, []);

  /**
   * Remove course from semester (returns to unplaced)
   */
  const handleRemoveCourse = useCallback(() => {
    if (!selectedCourse) return;

    const updatedSemesters = semesters.map((sem) => ({
      ...sem,
      courses: sem.courses.filter((c) => c.id !== selectedCourse.id),
    }));

    const updatedUnplaced = [...unplacedCourses, selectedCourse];

    setSemesters(updatedSemesters);
    setUnplacedCourses(updatedUnplaced);
    setIsDrawerOpen(false);
    setSelectedCourse(null);
    setIsDirty(true);
  }, [selectedCourse, semesters, unplacedCourses]);

  /**
   * Reset canvas: all courses back to unplaced
   */
  const handleReset = useCallback(() => {
    if (!confirm('This will reset all semesters and return courses to the left panel. Continue?')) {
      return;
    }

    setSemesters(initializeDefaultSemesters(studentProfile));
    setUnplacedCourses(remainingCourses);
    setIsDirty(true);
    setIsDrawerOpen(false);
  }, [studentProfile, remainingCourses]);

  /**
   * Auto-suggest (placeholder for future AI integration)
   */
  const handleAutoSuggest = useCallback(async () => {
    // TODO: Integrate with existing AI service to generate optimized schedule
    console.log('Auto-suggest clicked', { unplacedCourses, semesters });
    // Placeholder: show a toast or dialog
  }, [unplacedCourses, semesters]);

  /**
   * Save draft to local storage
   */
  const handleSaveDraft = useCallback(async () => {
    try {
      setIsSaving(true);
      // Store in sessionStorage for quick recovery
      sessionStorage.setItem(
        `sandbox-draft-${studentId}`,
        JSON.stringify({ semesters, unplacedCourses, timestamp: Date.now() })
      );
      setIsDirty(false);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to save draft:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  }, [studentId, semesters, unplacedCourses]);

  /**
   * Apply plan: save to backend
   */
  const handleApplyPlan = useCallback(async () => {
    if (!confirm('Apply this plan as your active graduation plan?')) {
      return;
    }

    try {
      setIsSaving(true);

      // Call backend save if provided
      if (onSavePlan) {
        await onSavePlan(semesters);
      }

      setIsDirty(false);
      // TODO: Show success toast and navigate or refresh
    } catch (error) {
      console.error('Failed to apply plan:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  }, [semesters, onSavePlan]);

  /**
   * Add new semester
   */
  const handleAddSemester = useCallback(() => {
    const newTerm = generateNextTerm(semesters);
    const newSemester: SemesterLane = {
      id: `sem-${Date.now()}`,
      term: newTerm,
      courses: [],
      notes: '',
    };

    setSemesters([...semesters, newSemester]);
    setIsDirty(true);
  }, [semesters]);

  /**
   * Delete semester (returns its courses to unplaced)
   */
  const handleDeleteSemester = useCallback(
    (semesterId: string) => {
      const semesterToDelete = semesters.find((s) => s.id === semesterId);
      if (!semesterToDelete) return;

      if (!confirm(`Delete semester "${semesterToDelete.term}"? Courses will return to the left panel.`)) {
        return;
      }

      const updatedSemesters = semesters.filter((s) => s.id !== semesterId);
      const returnedCourses = semesterToDelete.courses;

      setSemesters(updatedSemesters);
      setUnplacedCourses([...unplacedCourses, ...returnedCourses]);
      setIsDirty(true);
    },
    [semesters, unplacedCourses]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen w-full flex flex-col bg-background">
        {/* Toolbar */}
        <PlannerToolbar
          onReset={handleReset}
          onAutoSuggest={handleAutoSuggest}
          onSaveDraft={handleSaveDraft}
          onApplyPlan={handleApplyPlan}
          isDirty={isDirty}
          isSaving={isSaving}
        />

        {/* Main layout: sidebar + canvas + drawer */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile drawer toggle button (visible on sm screens) */}
          <button
            onClick={() => setIsMobileCoursePanelOpen(true)}
            className="md:hidden fixed bottom-8 left-6 z-40 bg-primary text-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Open courses panel"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Left Panel: Courses List */}
          <CoursesPanel
            courses={filteredCourses}
            filters={filters}
            onFilterChange={setFilters}
            onCoursePillClick={handleCourseSelect}
            isMobileOpen={isMobileCoursePanelOpen}
            onMobileClose={() => setIsMobileCoursePanelOpen(false)}
          />

          {/* Main Canvas */}
          <SandboxCanvas
            semesters={semesters}
            onSemesterChange={handleSemesterChange}
            onCourseSelect={handleCourseSelect}
            onAddSemester={handleAddSemester}
            onDeleteSemester={handleDeleteSemester}
          />

          {/* Right Drawer: Course Details */}
          <CourseDetailsDrawer
            course={selectedCourse}
            isOpen={isDrawerOpen}
            onClose={() => {
              setIsDrawerOpen(false);
              setSelectedCourse(null);
            }}
            onRemove={handleRemoveCourse}
          />
        </div>
      </div>

      {/* Drag overlay - shows course being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeDraggingCourse ? (
          <div className="p-3 rounded-lg bg-white shadow-2xl border-2 border-primary">
            <p className="font-mono text-xs font-semibold text-foreground uppercase mb-1">
              {activeDraggingCourse.code}
            </p>
            <p className="text-sm font-medium text-foreground max-w-xs">
              {activeDraggingCourse.title}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Initialize default semesters based on student profile
 */
function initializeDefaultSemesters(_profile: StudentProfile): SemesterLane[] {
  // Generate 6 default semesters from next expected term
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Determine current term (simplified)
  let semester = Math.floor(currentMonth / 4) + 1; // 0→1, 4→2, 8→3 (Spring, Summer, Fall)
  let year = currentYear;

  if (semester === 3) {
    // Fall semester, next term is Winter/Spring
    semester = 1;
    year += 1;
  } else {
    semester += 1;
  }

  const terms = [
    'Winter',
    'Spring',
    'Summer',
    'Fall',
  ];
  const semesters: SemesterLane[] = [];

  // Generate 6 terms
  for (let i = 0; i < 6; i++) {
    const termName = terms[semester % 4];
    semesters.push({
      id: `sem-${i}`,
      term: `${termName} ${year}`,
      courses: [],
      notes: '',
    });

    semester += 1;
    if (semester % 4 === 0) {
      year += 1;
    }
  }

  return semesters;
}

/**
 * Generate the next term name after the last semester
 */
function generateNextTerm(semesters: SemesterLane[]): string {
  if (semesters.length === 0) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    return `Fall ${year}`;
  }

  const lastSemester = semesters[semesters.length - 1];
  const [termName, yearStr] = lastSemester.term.split(' ');
  const year = parseInt(yearStr);

  const terms = ['Winter', 'Spring', 'Summer', 'Fall'];
  const currentIndex = terms.indexOf(termName);
  const nextIndex = (currentIndex + 1) % 4;
  const nextYear = nextIndex === 0 ? year + 1 : year;

  return `${terms[nextIndex]} ${nextYear}`;
}
