'use client';

import React from 'react';
import Box from '@mui/material/Box';
import { useDroppable } from '@dnd-kit/core';

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface DroppableTermProps {
  term: Term;
  termIndex: number;
  children: React.ReactNode;
  isEditMode: boolean;
  modifiedTerms: Set<number>;
}

export function DroppableTerm({
  term,
  termIndex,
  children,
  isEditMode,
  modifiedTerms,
}: DroppableTermProps) {
  const termId = `term-${termIndex}`;
  const hasBeenModified = modifiedTerms.has(termIndex);

  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: termId,
    data: {
      term,
      termIndex,
    },
    disabled: !isEditMode,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        // Invisible wrapper - only provide drop zone functionality
        position: 'relative',
        // Add orange glow effect for modified terms
        ...(hasBeenModified && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            backgroundColor: 'transparent',
            borderRadius: 3,
            border: '2px solid var(--action-edit)',
            pointerEvents: 'none',
            zIndex: 0,
            boxShadow: '0 0 8px rgba(255, 165, 0, 0.3)'
          }
        }),
        // Add subtle visual feedback when dragging over in edit mode
        '&::before': isOver && isEditMode ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--primary-15)',
          borderRadius: 2,
          border: '2px dashed var(--primary)',
          pointerEvents: 'none',
          zIndex: 1
        } : {}
      }}
    >
      {children}
    </Box>
  );
}
