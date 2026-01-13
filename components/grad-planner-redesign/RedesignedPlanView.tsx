'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import type { RedesignedPlanViewProps, GradPlan, Course, Term } from './types';
import { RedesignedPlanHeader } from './RedesignedPlanHeader';
import { DroppableTermCard } from './DroppableTermCard';
import { RedesignedCourseCard } from './RedesignedCourseCard';
import { RedesignedEventCard } from './RedesignedEventCard';

/**
 * REDESIGNED PLAN VIEW
 *
 * Main graduation plan view with drag-and-drop support
 * This is a PREVIEW VERSION using mock data
 * No backend integration - just for design demonstration
 *
 * Features:
 * - Drag and drop courses between terms
 * - Edit mode toggle
 * - Visual feedback during drag operations
 * - Save/cancel functionality (preview only - no backend save)
 */
export function RedesignedPlanView({
  gradPlan,
  isEditMode: initialEditMode = false,
  onPlanUpdate,
  availablePlans = [],
  onSelectPlan,
  onCreateNewPlan,
}: RedesignedPlanViewProps) {
  const [editablePlan, setEditablePlan] = useState<GradPlan>(gradPlan);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // Update editable plan when gradPlan prop changes (for plan switching)
  React.useEffect(() => {
    setEditablePlan(gradPlan);
  }, [gradPlan]);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    })
  );

  // Calculate statistics
  const statistics = useMemo(() => {
    const currentTermIndex = editablePlan.terms.findIndex((t) => t.isActive);
    const currentSemesterCredits =
      currentTermIndex >= 0
        ? editablePlan.terms[currentTermIndex].courses.reduce((sum, c) => sum + c.credits, 0)
        : 0;

    const plannedCredits = editablePlan.terms.reduce((sum, term) => {
      return (
        sum +
        term.courses
          .filter((c) => c.status === 'planned' || c.status === 'remaining')
          .reduce((courseSum, c) => courseSum + c.credits, 0)
      );
    }, 0);

    return {
      currentSemesterCredits,
      plannedCredits,
    };
  }, [editablePlan]);

  // Find course by ID across all terms
  const findCourse = (courseId: string): { course: Course; termId: number } | null => {
    for (const term of editablePlan.terms) {
      const course = term.courses.find((c) => c.id === courseId);
      if (course) {
        return { course, termId: term.id };
      }
    }
    return null;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const courseId = event.active.id as string;
    const found = findCourse(courseId);
    if (found) {
      setActiveCourse(found.course);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCourse(null);

    if (!over) return;

    const courseId = active.id as string;
    const targetTermId = over.id as number;

    // Find source term and course
    const found = findCourse(courseId);
    if (!found) return;

    const { course, termId: sourceTermId } = found;

    // Don't do anything if dropped in same term
    if (sourceTermId === targetTermId) return;

    // Move course to new term
    setEditablePlan((prev) => {
      const newTerms = prev.terms.map((term) => {
        // Remove from source term
        if (term.id === sourceTermId) {
          return {
            ...term,
            courses: term.courses.filter((c) => c.id !== courseId),
          };
        }
        // Add to target term
        if (term.id === targetTermId) {
          return {
            ...term,
            courses: [...term.courses, course],
          };
        }
        return term;
      });

      return {
        ...prev,
        terms: newTerms,
      };
    });
  };

  // Handle edit mode toggle
  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Handle save (preview only - no backend)
  const handleSave = () => {
    console.log('Preview mode: Saving changes', editablePlan);
    setIsEditMode(false);
    onPlanUpdate?.(editablePlan);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditablePlan(gradPlan); // Reset to original
    setIsEditMode(false);
  };

  // Handle add course (preview only - show alert)
  const handleAddCourse = (termId: number) => {
    alert(`Preview mode: Add course to term ${termId}`);
  };

  // Handle set active term
  const handleSetActive = (termId: number) => {
    setEditablePlan((prev) => ({
      ...prev,
      terms: prev.terms.map((term) => ({
        ...term,
        isActive: term.id === termId,
      })),
    }));
  };

  // Handle update term label
  const handleUpdateLabel = (termId: number, newLabel: string) => {
    setEditablePlan((prev) => ({
      ...prev,
      terms: prev.terms.map((term) =>
        term.id === termId ? { ...term, label: newLabel } : term
      ),
    }));
  };

  // Handle update plan name
  const handleUpdatePlanName = (newName: string) => {
    setEditablePlan((prev) => ({
      ...prev,
      planName: newName,
    }));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        {/* Plan Header */}
        <RedesignedPlanHeader
          planName={editablePlan.planName}
          studentName={editablePlan.studentName}
          totalCredits={editablePlan.totalCredits}
          earnedCredits={editablePlan.earnedCredits}
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          onSave={handleSave}
          onCancel={handleCancel}
          currentSemesterCredits={statistics.currentSemesterCredits}
          plannedCredits={statistics.plannedCredits}
          availablePlans={availablePlans.map((p) => ({ planId: p.planId, planName: p.planName }))}
          currentPlanId={editablePlan.planId}
          onSelectPlan={onSelectPlan}
          onCreateNewPlan={onCreateNewPlan}
          onUpdatePlanName={handleUpdatePlanName}
        />

        {/* Term Cards - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {editablePlan.terms.map((term) => (
            <DroppableTermCard
              key={term.id}
              term={term}
              isEditMode={isEditMode}
              onAddCourse={() => handleAddCourse(term.id)}
              onSetActive={() => handleSetActive(term.id)}
              onUpdateLabel={(newLabel) => handleUpdateLabel(term.id, newLabel)}
            />
          ))}
        </div>

        {/* Events Section - Compact */}
        {editablePlan.events.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-black text-[var(--foreground)]">
              Important Milestones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editablePlan.events.map((event) => (
                <RedesignedEventCard
                  key={event.id}
                  event={event}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCourse && (
          <div className="rotate-3 scale-105">
            <RedesignedCourseCard course={activeCourse} isDragging={true} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
