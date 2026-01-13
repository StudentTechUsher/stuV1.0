'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { RedesignedCourseCardProps } from './types';
import { RedesignedCourseCard } from './RedesignedCourseCard';

/**
 * DRAGGABLE COURSE CARD WRAPPER
 *
 * Wraps RedesignedCourseCard with drag-and-drop draggable functionality
 * Uses @dnd-kit/core useDraggable hook
 */
export function DraggableCourseCard(props: RedesignedCourseCardProps) {
  const { course, isEditMode } = props;

  // Make this course draggable (only in edit mode)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: course.id,
    data: {
      type: 'course',
      course,
    },
    disabled: !isEditMode, // Only draggable in edit mode
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RedesignedCourseCard
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
