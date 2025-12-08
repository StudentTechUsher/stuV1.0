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
  onAddCourse?: (termIndex: number) => void;
}

function sumTermCredits(term: TermBlock): number {
  return term.courses.reduce((sum, course) => sum + course.credits, 0);
}

export function TermCard({ term, isEditMode = false, modifiedTerms, onAddCourse }: TermCardProps) {
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
      <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
        {/* Add Course Button - Left side */}
        {isEditMode && onAddCourse && (
          <button
            type="button"
            onClick={() => onAddCourse(term.termIndex)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color-mix(in_srgb,var(--primary)_80%,var(--foreground)_20%)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] rounded-md hover:bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Course
          </button>
        )}
        {/* Credits total - Right side */}
        <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide ml-auto">
          {totalCredits} TOTAL
        </span>
      </div>
    </div>
  );
}
