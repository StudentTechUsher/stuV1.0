'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Course } from './types';

export interface CoursePillProps {
  course: Course;

  onClick: () => void;
}

/**
 * CoursePill: Draggable course card for left panel
 * Shows code, title, credits, and requirement tag
 */
export function CoursePill({ course, onClick }: CoursePillProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } =
    useDraggable({
      id: `course-pill-${course.id}`,
      data: { course, source: 'unplaced' },
    });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;

  const requirementColor = getRequirementColor(course.requirement);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 rounded-lg bg-white border border-muted-foreground/10 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${isBeingDragged ? 'opacity-50 scale-95' : ''
        }`}
      role="button"
      tabIndex={0}
    >
      {/* Code and credits row */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-semibold text-xs text-foreground uppercase tracking-wide">
          {course.code}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {course.credits}cr
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {course.title}
      </p>

      {/* Requirement tag */}
      {course.requirement && (
        <div
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium text-white ${requirementColor}`}
        >
          {course.requirement}
        </div>
      )}
    </div>
  );
}

/**
 * Get background color for requirement type
 */
function getRequirementColor(requirement?: string): string {
  switch (requirement?.toLowerCase()) {
    case 'major':
      return 'bg-primary';
    case 'minor':
      return 'bg-blue-900';
    case 'gen ed':
    case 'general education':
      return 'bg-blue-500';
    case 'elective':
    case 'electives':
      return 'bg-violet-600';
    default:
      return 'bg-gray-500';
  }
}
