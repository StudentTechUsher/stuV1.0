'use client';

import React from 'react';
import type { ProgressCategory } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryTabsProps {
  categories: ProgressCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  // Helper to get display name
  const getDisplayName = (name: string) => {
    if (name === 'General Education') return 'GE';
    if (name === 'Religion') return 'REL';
    if (name === 'Electives') return 'ELECTIVE';
    return name.toUpperCase();
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
                    {getDisplayName(category.name)}
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
