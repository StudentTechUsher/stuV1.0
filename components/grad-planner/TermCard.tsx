'use client';

import React, { useState } from 'react';
import { PencilLine, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableCourse } from './DraggableCourse';
import { DroppableTerm } from './DroppableTerm';
import type { Term as PlannerTerm } from './types';
import { setActiveTermAction, updateTermTitleAction } from '@/lib/services/server-actions';
import { getTermCompletionStats } from '@/lib/utils/termHelpers';

interface TermCardProps {
  term: PlannerTerm;
  termIndex: number;
  isEditMode: boolean;
  currentPlanData: PlannerTerm[];
  modifiedTerms: Set<number>;
  movedCourses: Set<string>;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
  onDeleteTerm?: (termIndex: number) => void;
  onAddCourse?: (termIndex: number) => void;
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
  gradPlanId?: string;
}

const statBadgeBase =
  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_26px_60px_-42px_rgba(8,35,24,0.55)] transition-all duration-200';

/**
 * Visual + structural refresh for term cards in the grad planner.
 * Aligns with the dashboard card language by using softer surfaces,
 * stat pills, and clearer spacing while preserving existing drag / edit logic.
 */
export function TermCard({
  term,
  termIndex,
  isEditMode,
  currentPlanData,
  modifiedTerms,
  movedCourses,
  onMoveCourse,
  onDeleteTerm,
  onAddCourse,
  onSubstituteCourse,
  gradPlanId,
}: Readonly<TermCardProps>) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(term.term);
  const [isSettingActiveTerm, setIsSettingActiveTerm] = useState(false);

  const handleSetActiveTerm = async () => {
    if (!gradPlanId) return;

    setIsSettingActiveTerm(true);
    try {
      const result = await setActiveTermAction(gradPlanId, termIndex);
      if (result.success) {
        // Trigger a page refresh to show updated state
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
      const result = await updateTermTitleAction(gradPlanId, termIndex, editedTitle);
      if (result.success) {
        setIsEditingTitle(false);
        // Trigger a page refresh to show updated state
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
    setEditedTitle(term.term);
    setIsEditingTitle(false);
  };
  const termCredits =
    term.credits_planned ||
    (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
  const totalCourses = term.courses?.length ?? 0;
  const visibleTermLabel = term.term?.trim() || `Term ${termIndex + 1}`;
  const isEmpty = !term.courses || term.courses.length === 0;

  // Use the stored completion metadata or fallback to false
  const allCoursesCompleted = term.allCoursesCompleted ?? false;
  const termPassed = term.termPassed ?? false;
  const completionStats = getTermCompletionStats(term);

  // Debug logging
  console.log(`TermCard ${termIndex} (${term.term}):`, {
    gradPlanId,
    'term.is_active': term.is_active,
    isEmpty,
    courseCount: term.courses?.length ?? 0,
    allCoursesCompleted,
    termPassed,
    completionStats,
    'showSetActiveButton': gradPlanId && !term.is_active && !termPassed,
  });

  return (
    <DroppableTerm
      term={term}
      termIndex={termIndex}
      isEditMode={isEditMode}
      modifiedTerms={modifiedTerms}
    >
      <article
        className={cn(
          'relative flex h-full flex-col gap-5 rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.18)_32%,var(--border)_68%)] bg-white p-6 shadow-[0_40px_90px_-60px_rgba(8,35,24,0.85)] transition-all duration-200 ease-out',
          'backdrop-blur-[2px]'
        )}
        data-editable={isEditMode}
        style={{
          borderColor: isEditMode
            ? 'color-mix(in srgb, var(--primary) 35%, var(--border) 65%)'
            : 'color-mix(in srgb, rgba(10,31,26,0.25) 30%, var(--border) 70%)',
        }}
      >
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_78%,#0a1f1a_22%)]">
                Term {termIndex + 1}
              </span>
              {term.is_active && (
                <span
                  className="flex h-5 items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 text-[10px] font-bold uppercase tracking-wide text-green-700"
                  role="status"
                  aria-label="Current active term"
                >
                  <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" />
                  Current Term
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEditTitle();
                    }}
                    className="font-header text-xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)] border-b-2 border-primary bg-transparent outline-none px-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="rounded px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTitle}
                    className="rounded px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-header text-xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--foreground)_92%,var(--primary)_8%)]">
                    {visibleTermLabel}
                  </h3>
                  {gradPlanId && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="rounded p-1 hover:bg-gray-100 transition-colors"
                      title="Edit term title"
                    >
                      <PencilLine size={16} strokeWidth={2} className="text-gray-500" />
                    </button>
                  )}
                </>
              )}
              {isEditMode && (
                <span
                  className="flex h-6 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-2 text-[11px] font-medium uppercase text-[color-mix(in_srgb,var(--foreground)_88%,var(--primary)_12%)]"
                  role="status"
                  aria-label="Editable term"
                >
                  <PencilLine size={14} strokeWidth={2} aria-hidden="true" />
                  Edit
                </span>
              )}
            </div>
            {gradPlanId && !term.is_active && !termPassed && (
              <button
                type="button"
                onClick={handleSetActiveTerm}
                disabled={isSettingActiveTerm}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary transition-colors disabled:opacity-50 mt-1 w-fit"
                title="Set as current term"
              >
                <Circle size={14} strokeWidth={2} />
                {isSettingActiveTerm ? 'Setting...' : 'Set as Current Term'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
           <span
              className={cn(
                statBadgeBase,
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200 hover:opacity-85 hover:-translate-y-[1px]"
              )}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <span className="font-bold text-base leading-none tracking-tight">
                {termCredits}
              </span>
              <span className="text-sm opacity-85">credits</span>
            </span>
           <span
              className={cn(
                statBadgeBase,
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200 hover:opacity-85 hover:-translate-y-[1px]"
              )}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <span className="font-bold text-base leading-none tracking-tight">
                {totalCourses}
              </span>
              <span className="text-sm opacity-85">courses</span>
            </span>

            {/* Completion Status Badge */}
            {allCoursesCompleted && (
              <span
                className={cn(
                  statBadgeBase,
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all duration-200"
                )}
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  color: "rgb(22, 163, 74)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                }}
              >
                <CheckCircle2 size={14} strokeWidth={2.5} />
                <span className="text-sm font-semibold">Completed</span>
              </span>
            )}
            {!allCoursesCompleted && termPassed && completionStats.withdrawn > 0 && (
              <span
                className={cn(
                  statBadgeBase,
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium"
                )}
                style={{
                  backgroundColor: "rgba(251, 146, 60, 0.12)",
                  color: "rgb(194, 65, 12)",
                  border: "1px solid rgba(251, 146, 60, 0.3)",
                }}
                title={`${completionStats.completed} completed, ${completionStats.withdrawn} withdrawn`}
              >
                <span className="text-xs">
                  {completionStats.completed}/{completionStats.total} passed ({completionStats.withdrawn}W)
                </span>
              </span>
            )}
            {!termPassed && completionStats.total > 0 && (
              <span
                className={cn(
                  statBadgeBase,
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium"
                )}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  color: "rgb(37, 99, 235)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                }}
              >
                <span className="text-xs">
                  {completionStats.completed > 0 ? `${completionStats.completed}/${completionStats.total} done` : 'Planned'}
                </span>
              </span>
            )}
          </div>
        </header>

        {term.notes && (
          <section
            className="rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_85%,var(--primary)_15%)] shadow-[0_16px_42px_-32px_rgba(18,249,135,0.6)]"
            aria-label="Term notes"
          >
            {term.notes}
          </section>
        )}

        {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
          <section className="flex flex-col gap-3" aria-label="Courses for this term">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
              Courses
            </span>
            <div className="flex flex-col gap-3">
              {term.courses.map((course, courseIndex) => {
                if (!course.code || !course.title) {
                  console.warn(`⚠️ Skipping invalid course in term ${termIndex + 1}:`, course);
                  return null;
                }

                return (
                  <DraggableCourse
                    key={`term-${termIndex}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`}
                    course={course}
                    courseIndex={courseIndex}
                    termIndex={termIndex}
                    isEditMode={isEditMode}
                    currentPlanData={currentPlanData}
                    onMoveCourse={onMoveCourse}
                    onSubstituteCourse={onSubstituteCourse}
                    movedCourses={movedCourses}
                  />
                );
              }).filter(Boolean)}
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center rounded-[7px] border border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_38%,var(--border)_62%)] bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-4 py-10 text-sm font-medium text-[color-mix(in_srgb,var(--muted-foreground)_78%,var(--foreground)_22%)]">
              No courses defined for this term yet
            </div>
            {isEditMode && isEmpty && onDeleteTerm && (
              <button
                type="button"
                onClick={() => onDeleteTerm(termIndex)}
                className="flex items-center justify-center gap-2 rounded-[7px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 hover:border-red-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Delete Empty Term
              </button>
            )}
          </div>
        )}

        {/* Add Course Button */}
        {isEditMode && onAddCourse && (
          <button
            type="button"
            onClick={() => onAddCourse(termIndex)}
            className="flex items-center justify-center gap-2 rounded-[7px] border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_88%,var(--primary)_12%)] transition-all hover:bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
      </article>
    </DroppableTerm>
  );
}
