'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Course, SemesterLane as SemesterLaneType } from './types';
import { SemesterCourseCard } from './SemesterCourseCard';

export interface SemesterLaneProps {
  semester: SemesterLaneType;
  courses: Course[];
  isEditMode?: boolean;
  onCoursesChange: (courses: Course[]) => void;
  onTermChange: (newTerm: string) => void;
  onDeleteSemester: () => void;
  onCourseSelect: (course: Course) => void;
  onRemoveCourse: (courseId: string) => void;
}

/**
 * SemesterLane: Single semester column with drop zone and course cards
 * Displays total credits, course count, and optional warnings
 */
export function SemesterLane({
  semester,
  courses,
  isEditMode = true,
  onCoursesChange,
  onTermChange,
  onDeleteSemester,
  onCourseSelect,
  onRemoveCourse,
}: SemesterLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-${semester.id}`,
    data: { semester, index: 0 },
  });

  const [isEditingTerm, setIsEditingTerm] = useState(false);
  const [editingTermValue, setEditingTermValue] = useState(semester.term);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNotesValue, setEditingNotesValue] = useState(semester.notes || '');

  // Calculate total credits
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  const courseCount = courses.length;

  // Determine warning state
  const creditWarning = totalCredits > 18 ? 'warning' : totalCredits < 12 ? 'info' : null;

  const handleSaveTermName = () => {
    if (editingTermValue.trim()) {
      onTermChange(editingTermValue);
    }
    setIsEditingTerm(false);
  };

  const handleSaveNotes = () => {
    // Notes saving would be handled via parent state
    setIsEditingNotes(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`h-full rounded-xl border-2 transition-all ${
        isOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/20 bg-muted/5'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-muted-foreground/10">
        {/* Term name */}
        {isEditingTerm ? (
          <input
            autoFocus
            value={editingTermValue}
            onChange={(e) => setEditingTermValue(e.target.value)}
            onBlur={handleSaveTermName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTermName();
              if (e.key === 'Escape') setIsEditingTerm(false);
            }}
            className="w-full px-2 py-1 rounded bg-muted text-foreground font-semibold mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ) : (
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-base font-semibold text-foreground">{semester.term}</h3>
            {isEditMode && (
              <button
                onClick={() => setIsEditingTerm(true)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Edit semester name"
              >
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Credits:</span>
              <span className={`font-semibold ${creditWarning === 'warning' ? 'text-action-edit' : creditWarning === 'info' ? 'text-action-info' : 'text-foreground'}`}>
                {totalCredits}
              </span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Courses:</span>
              <span className="font-semibold text-foreground">{courseCount}</span>
            </div>
          </div>

          {/* Delete button */}
          {isEditMode && (
            <button
              onClick={onDeleteSemester}
              className="p-1 hover:bg-red-50 rounded transition-colors"
              title="Delete semester"
            >
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Credit warning */}
        {creditWarning === 'warning' && (
          <p className="text-xs text-action-edit mt-2 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Heavy semester (&gt;18 credits)
          </p>
        )}
        {creditWarning === 'info' && (
          <p className="text-xs text-action-info mt-2 flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Light semester (&lt;12 credits)
          </p>
        )}
      </div>

      {/* Courses area */}
      <div className="p-3 min-h-32 max-h-96 overflow-y-auto space-y-2">
        {courses.length > 0 ? (
          courses.map((course) => (
            <SemesterCourseCard
              key={course.id}
              course={course}
              semesterId={semester.id}
              onClick={() => onCourseSelect(course)}
              onRemove={() => onRemoveCourse(course.id)}
              isEditMode={isEditMode}
            />
          ))
        ) : (
          <div className="h-20 flex items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Drag courses here to add them
            </p>
          </div>
        )}
      </div>

      {/* Notes section */}
      {isEditMode && (
        <div className="p-3 border-t border-muted-foreground/10">
          {isEditingNotes ? (
            <textarea
              autoFocus
              value={editingNotesValue}
              onChange={(e) => setEditingNotesValue(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Add notes for this semester..."
              className="w-full h-20 px-2 py-1 rounded bg-muted text-foreground text-xs placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            >
              {semester.notes ? (
                <span className="text-foreground">{semester.notes}</span>
              ) : (
                '+ Add notes'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
