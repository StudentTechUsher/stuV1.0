"use client";

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CoursePill, CourseItem } from './CoursePill';
import { PencilLine, CheckCircle2, Circle } from 'lucide-react';
import type { Term } from '../grad-planner/types';
import { updateTermTitleAction, setActiveTermAction } from '@/lib/services/server-actions';

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
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
  gradPlanId?: string;
}

function sumTermCredits(term: TermBlock): number {
  return term.courses.reduce((sum, course) => sum + course.credits, 0);
}

export function TermCard({ term, isEditMode = false, modifiedTerms, onAddCourse, onSubstituteCourse, gradPlanId }: TermCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(term.label);
  const [isSettingActiveTerm, setIsSettingActiveTerm] = useState(false);

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

  const handleSetActiveTerm = async () => {
    if (!gradPlanId) return;

    setIsSettingActiveTerm(true);
    try {
      const result = await setActiveTermAction(gradPlanId, term.termIndex);
      if (result.success) {
        window.location.reload();
      } else {
        console.error('Failed to set active term:', result.error);
        alert(`Failed to set active term: ${result.error}`);
      }
    } catch (error) {
      console.error('Error setting active term:', error);
      alert('An error occurred while setting the active term.');
    } finally {
      setIsSettingActiveTerm(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!gradPlanId || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const result = await updateTermTitleAction(gradPlanId, term.termIndex, editedTitle);
      if (result.success) {
        setIsEditingTitle(false);
        window.location.reload();
      } else {
        console.error('Failed to update term title:', result.error);
        alert(`Failed to update term title: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating term title:', error);
      alert('An error occurred while updating the term title.');
    }
  };

  const handleCancelEditTitle = () => {
    setEditedTitle(term.label);
    setIsEditingTitle(false);
  };

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
        {isEditingTitle ? (
          <div className="flex items-center gap-1 mb-0.5">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') handleCancelEditTitle();
              }}
              className="text-sm font-bold text-gray-900 border-b border-primary bg-transparent outline-none px-1 flex-1"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="px-1.5 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-50 rounded"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEditTitle}
              className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 mb-0.5">
            <h3 className="text-sm font-bold text-gray-900">{term.label}</h3>
            {gradPlanId && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="rounded p-0.5 hover:bg-gray-100 transition-colors"
                title="Edit term title"
              >
                <PencilLine size={12} strokeWidth={2} className="text-gray-500" />
              </button>
            )}
            {term.rawTerm.is_active && (
              <span className="flex h-4 items-center gap-1 rounded-full border border-green-300 bg-green-50 px-1.5 text-[9px] font-bold uppercase tracking-wide text-green-700 ml-1">
                <CheckCircle2 size={10} strokeWidth={2.5} />
                Current
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
          <span>Class / Credits</span>
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-1 mb-1.5 flex-1">
        {term.courses.length > 0 ? (
          term.courses.map((course) => (
            <CoursePill key={course.id} course={course} isEditMode={isEditMode} onSubstituteCourse={onSubstituteCourse} />
          ))
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">No courses</p>
        )}
      </div>

      {/* Term footer */}
      <div className="pt-1.5 border-t border-gray-200">
        <div className="flex items-center justify-between">
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
        {/* Set as Current Term button */}
        {gradPlanId && !term.rawTerm.is_active && (
          <button
            type="button"
            onClick={handleSetActiveTerm}
            disabled={isSettingActiveTerm}
            className="flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-primary transition-colors disabled:opacity-50 mt-1 w-fit"
          >
            <Circle size={11} strokeWidth={2} />
            {isSettingActiveTerm ? 'Setting...' : 'Set as Current Term'}
          </button>
        )}
      </div>
    </div>
  );
}
