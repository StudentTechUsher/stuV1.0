'use client';

import React from 'react';
import { GripVertical, Pencil, Trash2, RefreshCw } from 'lucide-react';
import type { RedesignedCourseCardProps } from './types';
import { STATUS_COLORS } from './designConstants';
import { RedesignedRequirementBadges } from './RedesignedRequirementBadges';

/**
 * REDESIGNED COURSE CARD
 *
 * Visual Design:
 * - Larger, more prominent (rounded-2xl, p-6)
 * - Clear status indication through background color
 * - Bold typography hierarchy
 * - Requirement badges use category colors
 * - Generous spacing between elements
 *
 * Status Styling:
 * - Completed: Solid bright green background, black text
 * - In Progress: 50% transparent green background
 * - Planned: Light grey background
 * - Remaining: White background with grey border
 */
export function RedesignedCourseCard({
  course,
  isDragging = false,
  isEditMode = false,
  onEdit,
  onSubstitute,
  onDelete,
  dragHandleProps,
}: RedesignedCourseCardProps) {
  const statusColors = STATUS_COLORS[course.status];

  // Card class names - compact
  const baseCardClasses = `
    flex flex-col gap-2 p-3 rounded-xl border-2 transition-all duration-200
    ${isDragging ? 'opacity-50 scale-105 rotate-3' : 'hover:shadow-md'}
    ${statusColors.text}
  `;

  // Render light mode card
  const renderLightModeCard = () => (
    <div
      className={`${baseCardClasses} dark:hidden`}
      style={{
        backgroundColor: statusColors.bg,
        borderColor: course.status === 'remaining' ? statusColors.border : 'transparent',
      }}
    >
      {renderCardContent()}
    </div>
  );

  // Render dark mode card
  const renderDarkModeCard = () => (
    <div
      className={`${baseCardClasses} hidden dark:flex`}
      style={{
        backgroundColor: statusColors.bgDark,
        borderColor: course.status === 'remaining' ? statusColors.borderDark : 'transparent',
      }}
    >
      {renderCardContent()}
    </div>
  );

  // Shared card content - compact
  const renderCardContent = () => (
    <>
      {/* Header: Drag Handle + Code Badge + Grade Badge + Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Drag Handle (only in edit mode) */}
          {isEditMode && dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing flex-shrink-0"
              aria-label="Drag to move course"
            >
              <GripVertical
                size={16}
                className="text-zinc-400 dark:text-zinc-500"
              />
            </div>
          )}

          {/* Course Code Badge */}
          <div className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 flex-shrink-0">
            <span className="text-xs font-black text-[var(--foreground)]">
              {course.code}
            </span>
          </div>

          {/* Grade Badge (if completed) */}
          {course.grade && (
            <div className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 flex-shrink-0">
              <span className="text-xs font-bold text-[var(--foreground)]">
                {course.grade}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons (only in edit mode) */}
        {isEditMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-zinc-700/50 transition-colors"
                aria-label="Edit course"
                type="button"
              >
                <Pencil size={12} />
              </button>
            )}
            {onSubstitute && (
              <button
                onClick={onSubstitute}
                className="p-1 rounded hover:bg-white/50 dark:hover:bg-zinc-700/50 transition-colors"
                aria-label="Substitute course"
                type="button"
              >
                <RefreshCw size={12} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Delete course"
                type="button"
              >
                <Trash2 size={12} className="text-red-500" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Course Title - Compact */}
      <h4 className="text-sm font-bold leading-tight">
        {course.title}
      </h4>

      {/* Footer: Requirement Badges + Credits */}
      <div className="flex items-center justify-between gap-2">
        {/* Requirement Badges */}
        <div className="flex-1 min-w-0">
          <RedesignedRequirementBadges fulfills={course.fulfills} compact />
        </div>

        {/* Credits */}
        <span className="text-xs font-bold opacity-70 flex-shrink-0">
          {course.credits}cr
        </span>
      </div>
    </>
  );

  return (
    <>
      {renderLightModeCard()}
      {renderDarkModeCard()}
    </>
  );
}
