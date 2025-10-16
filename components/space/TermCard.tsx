"use client";

import { useDroppable } from '@dnd-kit/core';
import { CoursePill, CourseItem } from './CoursePill';
import type { Term } from '../grad-planner/types';

export interface TermBlock {
  id: string;
  label: string;
  courses: CourseItem[];
  termIndex: number;
  rawTerm: Term;
}

interface TermCardProps {
  term: TermBlock;
  isEditMode?: boolean;
  modifiedTerms?: Set<number>;
}

function sumTermCredits(term: TermBlock): number {
  return term.courses.reduce((sum, course) => sum + course.credits, 0);
}

export function TermCard({ term, isEditMode = false, modifiedTerms }: TermCardProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: term.id,
    data: {
      term: term.rawTerm,
      termIndex: term.termIndex,
    },
    disabled: !isEditMode,
  });

  const isModified = modifiedTerms?.has(term.termIndex);

  const totalCredits = sumTermCredits(term);

  return (
    <div
      ref={setNodeRef}
      className="rounded-xl bg-white border border-gray-200 shadow-sm p-2 h-full flex flex-col"
      style={{
        outline: isOver && isEditMode ? '2px dashed var(--primary)' : undefined,
        outlineOffset: isOver && isEditMode ? '2px' : undefined,
        borderColor: isModified ? 'var(--action-edit)' : undefined,
      }}
    >
      {/* Term header */}
      <div className="mb-1.5">
        <h3 className="text-sm font-bold text-gray-900 mb-0.5">{term.label}</h3>
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
          <span>Class / Credits</span>
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-1 mb-1.5 flex-1">
        {term.courses.length > 0 ? (
          term.courses.map((course) => (
            <CoursePill key={course.id} course={course} isEditMode={isEditMode} />
          ))
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">No courses</p>
        )}
      </div>

      {/* Term footer */}
      <div className="pt-1.5 border-t border-gray-200 text-right">
        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          {totalCredits} TOTAL
        </span>
      </div>
    </div>
  );
}
