'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { RedesignedTermCardProps } from './types';
import { RedesignedTermCard } from './RedesignedTermCard';

/**
 * DROPPABLE TERM CARD WRAPPER
 *
 * Wraps RedesignedTermCard with drag-and-drop droppable functionality
 * Uses @dnd-kit/core useDroppable hook
 */
export function DroppableTermCard(props: RedesignedTermCardProps) {
  const { term } = props;

  // Make this term a droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: term.id,
    data: {
      type: 'term',
      termId: term.id,
    },
  });

  return (
    <div ref={setNodeRef}>
      <RedesignedTermCard {...props} isDropTarget={isOver} />
    </div>
  );
}
