'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

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
    <div ref={setNodeRef} className="relative h-full w-full">
      {/* Persistent accent for terms advisors/students have touched */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[24px] transition-all duration-200',
          hasBeenModified
            ? 'ring-2 ring-[var(--action-edit)] ring-offset-2 ring-offset-transparent shadow-[0_18px_48px_-28px_rgba(253,204,74,0.45)]'
            : 'ring-0'
        )}
        style={{ zIndex: 0 }}
      />

      {/* Active drop target affordance */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[24px] border-2 border-transparent opacity-0 transition-all duration-200',
          isEditMode && isOver && 'border-dashed border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] opacity-100 shadow-[0_28px_60px_-36px_rgba(18,249,135,0.55)]'
        )}
        style={{ zIndex: 1 }}
      />

      <div
        className={cn(
          'relative z-[2] h-full transition-all duration-200',
          isEditMode && isOver && 'translate-y-[-2px]'
        )}
      >
        {children}
      </div>
    </div>
  );
}
