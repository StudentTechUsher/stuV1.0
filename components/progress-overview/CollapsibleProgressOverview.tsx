'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ProgressOverviewContainer } from './ProgressOverviewContainer';
import type { ProgressCategory, OverallProgress } from './types';

interface CollapsibleProgressOverviewProps {
  categories: ProgressCategory[];
  overallProgress: OverallProgress;
  defaultExpanded?: boolean;
}

/**
 * A collapsible wrapper around the Progress Overview component.
 * Displays a compact header by default showing overall progress,
 * and expands to show the full Progress Overview when clicked.
 */
export function CollapsibleProgressOverview({
  categories,
  overallProgress,
  defaultExpanded = false,
}: CollapsibleProgressOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full bg-zinc-900 dark:bg-zinc-100 px-6 py-4 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-200"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-start gap-2 flex-1">
            <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
              Progress Overview
            </h3>

            {/* Mini progress bar in collapsed state */}
            <div className="w-full max-w-xs">
              <div className="relative h-3 w-full rounded-full bg-zinc-700 dark:bg-zinc-300 overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${Math.min(overallProgress.percentComplete, 100)}%` }}
                />
              </div>
            </div>

            <p className="font-body text-xs text-zinc-300 dark:text-zinc-700">
              {overallProgress.percentComplete}% complete • {overallProgress.completedCredits} of{' '}
              {overallProgress.totalCredits} credits
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="rounded-full bg-[var(--primary)] px-3 py-1 text-center">
              <span className="font-body-semi text-sm font-bold text-zinc-900">
                {overallProgress.percentComplete}%
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6">
            {categories.length > 0 ? (
              <ProgressOverviewContainer
                categories={categories}
                initialView="OVERALL"
              />
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-6 text-center">
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  No programs selected. Create a graduation plan to track your progress.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
