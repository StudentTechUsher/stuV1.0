'use client';

import React, { useState } from 'react';
import { PencilLine, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableCourse } from './DraggableCourse';
import { DroppableTerm } from './DroppableTerm';
import type { Term as PlannerTerm } from './types';
import { setActiveTermAction, updateTermTitleAction } from '@/lib/services/server-actions';

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
  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200';

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

  // Debug logging
  console.log(`TermCard ${termIndex}:`, {
    gradPlanId,
    'term.is_active': term.is_active,
    'showSetActiveButton': gradPlanId && !term.is_active,
    termTitle: term.term
  });

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

  return (
    <DroppableTerm
      term={term}
      termIndex={termIndex}
      isEditMode={isEditMode}
      modifiedTerms={modifiedTerms}
    >
      <article
        className={cn(
          'relative flex h-full flex-col gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-6 shadow-sm transition-all duration-200 ease-out',
          'hover:shadow-md',
          isEditMode && 'border-[color-mix(in_srgb,var(--primary)_25%,var(--border)_75%)]'
        )}
        data-editable={isEditMode}
      >
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
                Term {termIndex + 1}
              </span>
              {term.is_active && (
                <span
                  className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]"
                  role="status"
                  aria-label="Current active term"
                >
                  <CheckCircle2 size={12} strokeWidth={2.5} className="text-[var(--primary)]" aria-hidden="true" />
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
                    className="font-header text-xl font-black tracking-tight text-[var(--foreground)] border-b-2 border-primary bg-transparent outline-none px-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--foreground)] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTitle}
                    className="rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-header text-xl font-black tracking-tight text-[var(--foreground)]">
                    {visibleTermLabel}
                  </h3>
                  {gradPlanId && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="rounded-lg p-1 hover:bg-[var(--muted)] transition-colors"
                      title="Edit term title"
                    >
                      <PencilLine size={16} strokeWidth={2} className="text-[var(--muted-foreground)]" />
                    </button>
                  )}
                </>
              )}
              {isEditMode && (
                <span
                  className="flex h-6 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]"
                  role="status"
                  aria-label="Editable term"
                >
                  <PencilLine size={12} strokeWidth={2} className="text-[var(--primary)]" aria-hidden="true" />
                  Edit
                </span>
              )}
            </div>
            {gradPlanId && !term.is_active && (
              <button
                type="button"
                onClick={handleSetActiveTerm}
                disabled={isSettingActiveTerm}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors disabled:opacity-50 mt-1 w-fit"
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
          </div>
        </header>

        {term.notes && (
          <section
            className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)] shadow-sm"
            aria-label="Term notes"
          >
            {term.notes}
          </section>
        )}

        {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
          <section className="flex flex-col gap-3" aria-label="Courses for this term">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
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
            <div className="flex items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_30%,transparent)] bg-[var(--muted)] px-4 py-10 text-sm font-medium text-[var(--muted-foreground)]">
              No courses defined for this term yet
            </div>
            {isEditMode && isEmpty && onDeleteTerm && (
              <button
                type="button"
                onClick={() => onDeleteTerm(termIndex)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-100 hover:border-red-300 hover:shadow-sm"
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
            className="flex items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] transition-all hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:shadow-sm"
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
