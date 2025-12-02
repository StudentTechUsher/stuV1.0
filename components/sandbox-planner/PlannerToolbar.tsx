'use client';

import React from 'react';

export interface PlannerToolbarProps {
  onReset: () => void;
  onAutoSuggest: () => void;
  onSaveDraft: () => void;
  onApplyPlan: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

/**
 * PlannerToolbar: Top action bar with plan management buttons
 */
export function PlannerToolbar({
  onReset,
  onAutoSuggest,
  onSaveDraft,
  onApplyPlan,
  isDirty,
  isSaving,
}: PlannerToolbarProps) {
  return (
    <div className="h-16 bg-white border-b border-muted-foreground/10 flex items-center justify-between px-6 shadow-sm">
      {/* Left: Title */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Graduation Plan Sandbox</h2>
        {isDirty && (
          <p className="text-xs text-muted-foreground">Unsaved changes</p>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Reset Button */}
        <button
          onClick={onReset}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Clear all semesters and return courses to the left panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset Layout
        </button>

        {/* Auto-Suggest Button */}
        <button
          onClick={onAutoSuggest}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate an optimized schedule from remaining courses"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Auto-Suggest
        </button>

        {/* Save Draft Button */}
        <button
          onClick={onSaveDraft}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Save current layout as a draft (local storage)"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Save Draft
            </>
          )}
        </button>

        {/* Apply Plan Button */}
        <button
          onClick={onApplyPlan}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-background bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Save this plan as your active graduation plan"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Applying...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Apply Plan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
