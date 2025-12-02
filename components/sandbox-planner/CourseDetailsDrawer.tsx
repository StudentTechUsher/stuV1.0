'use client';

import React, { useEffect } from 'react';
import { Course } from './types';

export interface CourseDetailsDrawerProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: () => void;
}

/**
 * CourseDetailsDrawer: Right-side slide-in panel with full course information
 * Shows prerequisites, offering terms, description, and credit impact
 */
export function CourseDetailsDrawer({
  course,
  isOpen,
  onClose,
  onRemove,
}: CourseDetailsDrawerProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!course) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed md:absolute right-0 top-0 h-screen md:h-full w-full md:w-96 bg-white shadow-lg border-l border-muted-foreground/10 overflow-y-auto transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-muted-foreground/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {course.code}
              </p>
              <h3 className="text-lg font-semibold text-foreground line-clamp-2">
                {course.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
              aria-label="Close course details"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h4 className="text-sm font-semibold text-foreground mb-3">Overview</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Credits:</span>
                <span className="font-semibold text-foreground">{course.credits}</span>
              </div>
              {course.requirement && (
                <div className="flex justify-between items-center">
                  <span>Requirement:</span>
                  <span className="font-semibold text-foreground">{course.requirement}</span>
                </div>
              )}
              {course.fulfills && course.fulfills.length > 0 && (
                <div className="flex justify-start gap-2 flex-wrap">
                  {course.fulfills.map((fulfill) => (
                    <span
                      key={fulfill}
                      className="inline-flex px-2 py-1 rounded-full bg-primary/10 text-xs text-primary font-medium"
                    >
                      {fulfill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Prerequisites */}
          {course.prerequisite && (
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3">Prerequisites</h4>
              <p className="text-sm text-muted-foreground">{course.prerequisite}</p>
            </section>
          )}

          {/* Offering Terms */}
          {course.offeringTerms && course.offeringTerms.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Typically Offered
              </h4>
              <div className="flex flex-wrap gap-2">
                {course.offeringTerms.map((term) => (
                  <span
                    key={term}
                    className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-foreground"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Description */}
          {course.description && (
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {course.description}
              </p>
            </section>
          )}

          {/* Remove Button */}
          <div className="pt-4 border-t border-muted-foreground/10">
            <button
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
            >
              Remove from Plan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
