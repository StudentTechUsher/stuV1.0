'use client';

import React from 'react';
import type { ProgressCategory } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Special constant for the OVERALL overview tab */
export const OVERALL_VIEW = 'OVERALL';

interface CategoryTabsProps {
  categories: ProgressCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  /** If true, show an OVERALL tab at the beginning for overall degree progress */
  showOverallTab?: boolean;
  /** Overall degree progress percentage (required if showMainTab is true) */
  overallProgressPercent?: number;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  showOverallTab = false,
  overallProgressPercent = 0,
}: CategoryTabsProps) {
  // Helper to get display name
  const getDisplayName = (name: string, tabLabel?: string) => {
    if (tabLabel) return tabLabel;
    if (name === 'General Education') return 'Gen Ed';
    if (name === 'Religion') return 'Religion';
    if (name === 'Electives') return 'Electives';
    if (name === 'Institutional Requirements') return 'Institutional';
    return name;
  };

  // Helper to get full name for tooltip
  const getFullName = (name: string) => {
    if (name === 'GE') return 'General Education';
    if (name === 'REL') return 'Religion';
    return name;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 sm:gap-3 mb-6 flex-wrap">
        {/* OVERALL tab - shown first if enabled */}
        {showOverallTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectCategory(OVERALL_VIEW)}
                className={`flex flex-col items-start gap-1.5 transition-all duration-200 flex-1 min-w-0 ${
                  selectedCategory === OVERALL_VIEW ? 'scale-[1.02]' : 'scale-100 opacity-70 hover:opacity-90'
                }`}
              >
                {/* OVERALL label */}
                <span
                  className={`text-xs uppercase tracking-wider transition-all truncate ${
                    selectedCategory === OVERALL_VIEW ? 'font-black' : 'font-bold'
                  } text-[var(--foreground)]`}
                >
                  OVERALL
                </span>

                {/* Mini progress bar - black/grey theme */}
                <div
                  className={`relative rounded-lg bg-zinc-200 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 overflow-hidden transition-all duration-200 w-full ${
                    selectedCategory === OVERALL_VIEW ? 'h-8' : 'h-7'
                  }`}
                >
                  {/* Filled portion */}
                  <div
                    className="absolute inset-0 rounded-lg transition-all duration-300 bg-[var(--degree-progress)]"
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold">Overall Degree Progress: {overallProgressPercent}% complete</p>
            </TooltipContent>
          </Tooltip>
        )}

        {categories.map((category) => {
          const isSelected = category.name === selectedCategory;
          const progressPercent = category.percentComplete;

          return (
            <Tooltip key={category.name}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.name)}
                  className={`flex flex-col items-start gap-1.5 transition-all duration-200 flex-1 min-w-0 ${
                    isSelected ? 'scale-[1.02]' : 'scale-100 opacity-70 hover:opacity-90'
                  }`}
                >
                  {/* Category label */}
                  <span
                    className={`text-xs uppercase tracking-wider transition-all truncate ${
                      isSelected ? 'font-black' : 'font-bold'
                    } text-[var(--foreground)]`}
                  >
                    {getDisplayName(category.name, category.tabLabel)}
                  </span>

                  {/* Mini progress bar - responsive width */}
                  <div
                    className={`relative rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 overflow-hidden transition-all duration-200 w-full ${
                      isSelected ? 'h-8' : 'h-7'
                    }`}
                  >
                    {/* Filled portion (overlaid on top) */}
                    <div
                      className="absolute inset-0 rounded-lg transition-all duration-300"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">{getFullName(category.name)}: {progressPercent}% complete</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
