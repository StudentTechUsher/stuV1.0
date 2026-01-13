'use client';

import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { RedesignedTermCardProps } from './types';
import { DraggableCourseCard } from './DraggableCourseCard';

/**
 * REDESIGNED TERM CARD
 *
 * Visual Design:
 * - Large, spacious card (rounded-2xl, p-8)
 * - Bold term header with clear hierarchy
 * - Status badges for current term, total credits
 * - Course list with generous spacing (gap-4)
 * - Light background with subtle border
 * - Highlighted border when drop target
 *
 * Features:
 * - Inline edit term title
 * - "Current Term" indicator badge
 * - Total credits display
 * - Add course button at bottom
 * - Set active button
 * - Delete term button
 * - Droppable for drag-and-drop
 */
export function RedesignedTermCard({
  term,
  isEditMode,
  isDropTarget = false,
  onAddCourse,
  onSetActive,
  onUpdateLabel,
  onDeleteTerm,
}: RedesignedTermCardProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(term.label);

  // Calculate total credits for this term
  const totalCredits = term.courses.reduce((sum, course) => sum + course.credits, 0);

  // Handle label editing
  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    if (labelValue.trim() !== term.label && labelValue.trim() !== '') {
      onUpdateLabel(labelValue.trim());
    } else {
      setLabelValue(term.label); // Reset if empty or unchanged
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    } else if (e.key === 'Escape') {
      setLabelValue(term.label);
      setIsEditingLabel(false);
    }
  };

  return (
    <div
      className={`
        flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800
        border-2 transition-all duration-200
        ${
          isDropTarget
            ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,white)] dark:bg-[color-mix(in_srgb,var(--primary)_12%,rgb(39,39,42))]'
            : 'border-zinc-200 dark:border-zinc-700'
        }
      `}
    >
      {/* Header Row - Compact */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Term Label + Current Badge */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Term Label - editable in edit mode */}
          {isEditMode && isEditingLabel ? (
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              className="text-lg font-black bg-transparent border-b-2 border-[var(--primary)] outline-none text-[var(--foreground)] flex-1"
              autoFocus
            />
          ) : (
            <h3
              className={`text-lg font-black text-[var(--foreground)] ${
                isEditMode ? 'cursor-pointer hover:text-[var(--primary)] transition-colors' : ''
              }`}
              onClick={() => isEditMode && setIsEditingLabel(true)}
            >
              {term.label}
            </h3>
          )}

          {/* Current Term Badge */}
          {term.isActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--primary)] text-black flex-shrink-0">
              <Check size={12} className="font-bold" />
              <span className="text-xs font-black uppercase tracking-wider">
                Current
              </span>
            </div>
          )}
        </div>

        {/* Right: Credits Badge + Delete Button */}
        <div className="flex items-center gap-2">
          {/* Credits Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700">
            <span className="text-sm font-black text-[var(--foreground)]">
              {totalCredits}
            </span>
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
              cr
            </span>
          </div>

          {/* Delete Term Button (only in edit mode) */}
          {isEditMode && onDeleteTerm && (
            <button
              onClick={onDeleteTerm}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Delete term"
              type="button"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Course List - Compact */}
      <div className="flex flex-col gap-2">
        {term.courses.length > 0 ? (
          term.courses.map((course) => (
            <DraggableCourseCard
              key={course.id}
              course={course}
              isEditMode={isEditMode}
            />
          ))
        ) : (
          <div className="py-6 text-center rounded-lg bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-[var(--muted-foreground)]">
              No courses
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions - Compact (only in edit mode) */}
      {isEditMode && (
        <div className="flex flex-col gap-2">
          {/* Add Course Button */}
          <button
            onClick={onAddCourse}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] transition-all"
            type="button"
          >
            <Plus size={14} className="text-[var(--muted-foreground)]" />
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
              Add Course
            </span>
          </button>

          {/* Set Active Button (if not already active) */}
          {!term.isActive && (
            <button
              onClick={onSetActive}
              className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors text-center"
              type="button"
            >
              Set as Current
            </button>
          )}
        </div>
      )}
    </div>
  );
}
