"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core"
import { usePlanStore } from "@/lib/store"
import { CourseCard } from "./course-card"

// Custom collision detection strategy
const collisionDetectionStrategy: CollisionDetection = (args) => {
  // First, check for direct pointer collisions
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    return pointerCollisions
  }

  // Then, check for intersecting rectangles
  const rectCollisions = rectIntersection(args)
  return rectCollisions
}

interface DragDropContextProps {
  children: React.ReactNode
}

export function DragDropContext({ children }: DragDropContextProps) {
  const { 
    activeCourseId, 
    setActiveCourseId, 
    getCourse, 
    moveCourse,
  } = usePlanStore()

  // Set up DnD sensors
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
  )

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCourseId(String(event.active.id))
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Currently no over handling needed
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = String(active.id)
    const activeCourse = getCourse(activeId)
    if (!activeCourse || !activeCourse.semesterTerm) return

    // Get the semester term from the over ID (either a course or semester)
    const overId = String(over.id)
    const overCourse = getCourse(overId)
    const overSemesterTerm = overCourse?.semesterTerm ?? overId

    // If dropping into a different semester or reordering within the same semester
    if (overCourse) {
      // Find the index of the over course
      const semester = usePlanStore.getState().getSemester(overSemesterTerm)
      const overIndex = semester?.courses.findIndex(c => c.code === over.id) ?? -1
      
      moveCourse(
        activeId,
        activeCourse.semesterTerm,
        overSemesterTerm,
        overIndex
      )
    } else {
      // Dropping directly onto a semester
      moveCourse(
        activeId,
        activeCourse.semesterTerm,
        overSemesterTerm
      )
    }

    setActiveCourseId(null)
  }

  // Get active course for drag overlay
  const activeCourseFull = activeCourseId ? getCourse(activeCourseId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}

      <DragOverlay>
        {activeCourseFull ? (
          <CourseCard
            courseCode={activeCourseFull.code}
            courseTitle={activeCourseFull.title}
            credits={activeCourseFull.credits}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
} 
