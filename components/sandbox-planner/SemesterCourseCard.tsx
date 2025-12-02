'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Course } from './types';

export interface SemesterCourseCardProps {
  course: Course;
  semesterId: string;
  isEditMode?: boolean;
  onClick: () => void;
  onRemove: () => void;
}

/**
 * SemesterCourseCard: Course card displayed in a semester lane
 * Shows code, title, credits, and requirement tag
 * Supports drag-to-reorder within same semester
 */
export function SemesterCourseCard({
  course,
  semesterId,
  isEditMode = true,
  onClick,
  onRemove,
}: SemesterCourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `course-${course.id}-${semesterId}`,
    data: { course, semesterId, source: 'semester' },
    disabled: !isEditMode,
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
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`p-3 rounded-lg bg-white border border-muted-foreground/20 cursor-pointer transition-all hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono font-semibold text-xs text-foreground uppercase tracking-wide flex-shrink-0">
          {course.code}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {course.credits}cr
          </span>
          {isEditMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove course"
            >
              <svg
                className="w-3 h-3 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {course.title}
      </p>

      {/* Requirement tag */}
      {course.requirement && (
        <div
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white ${requirementColor}`}
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
