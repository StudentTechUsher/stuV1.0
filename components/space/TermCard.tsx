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
      className="rounded-2xl bg-white dark:bg-[var(--card)] border border-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)] shadow-sm p-4 h-full flex flex-col transition-all duration-200 hover:shadow-md"
      style={{
        outline: isOver && isEditMode ? '2px dashed var(--foreground)' : undefined,
        outlineOffset: isOver && isEditMode ? '2px' : undefined,
        borderColor: isModified ? 'var(--action-edit)' : undefined,
      }}
    >
      {/* Term header */}
      <div className="mb-2">
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
              className="text-sm font-black text-[var(--foreground)] border-b-2 border-[var(--primary)] bg-transparent outline-none px-1 flex-1"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="px-2 py-0.5 text-[10px] font-bold text-[var(--foreground)] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEditTitle}
              className="px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-black text-[var(--foreground)]">{term.label}</h3>
            {gradPlanId && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="rounded-lg p-0.5 hover:bg-[var(--muted)] transition-colors"
                title="Edit term title"
              >
                <PencilLine size={12} strokeWidth={2} className="text-[var(--muted-foreground)]" />
              </button>
            )}
            {term.rawTerm.is_active && (
              <span className="flex h-4 items-center gap-1 rounded-full bg-[var(--foreground)] px-1.5 text-[9px] font-bold uppercase tracking-wide text-[var(--background)] ml-1">
                <CheckCircle2 size={10} strokeWidth={2.5} />
                Current
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider">
          <span>Class / Credits</span>
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-1.5 mb-2 flex-1">
        {term.courses.length > 0 ? (
          term.courses.map((course) => (
            <CoursePill key={course.id} course={course} isEditMode={isEditMode} onSubstituteCourse={onSubstituteCourse} />
          ))
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-3">No courses</p>
        )}
      </div>

      {/* Term footer */}
      <div className="pt-2 border-t border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)]">
        <div className="flex items-center justify-between">
          {/* Add Course Button - Left side */}
          {isEditMode && onAddCourse && (
            <button
              type="button"
              onClick={() => onAddCourse(term.termIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--foreground)] bg-[var(--muted)] border border-[color-mix(in_srgb,var(--muted-foreground)_15%,transparent)] rounded-xl hover:bg-[color-mix(in_srgb,var(--muted-foreground)_10%,var(--muted))] transition-all duration-200"
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
          <span className="rounded-full bg-[var(--foreground)] px-2.5 py-1 text-[10px] font-bold text-[var(--background)] uppercase tracking-wider ml-auto">
            {totalCredits} Total
          </span>
        </div>
        {/* Set as Current Term button */}
        {gradPlanId && !term.rawTerm.is_active && (
          <button
            type="button"
            onClick={handleSetActiveTerm}
            disabled={isSettingActiveTerm}
            className="flex items-center gap-1 text-[10px] font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 mt-1.5 w-fit"
          >
            <Circle size={11} strokeWidth={2} />
            {isSettingActiveTerm ? 'Setting...' : 'Set as Current Term'}
          </button>
        )}
      </div>
    </div>
  );
}
