'use client';

import React from 'react';
import type { ProgressCategory } from './types';

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
  return (
    <div className="flex items-center gap-6 mb-8">
      {categories.map((category) => {
        const isSelected = category.name === selectedCategory;
        const progressPercent = category.percentComplete;

        return (
          <button
            key={category.name}
            type="button"
            onClick={() => onSelectCategory(category.name)}
            className={`flex flex-col items-start gap-2 transition-all duration-200 ${
              isSelected ? 'scale-105' : 'scale-100 opacity-70 hover:opacity-90'
            }`}
          >
            {/* Category label */}
            <span
              className={`text-sm uppercase tracking-wider transition-all ${
                isSelected ? 'font-black' : 'font-bold'
              } text-[var(--foreground)]`}
            >
              {category.name === 'General Education'
                ? 'GE'
                : category.name === 'Religion'
                ? 'REL'
                : category.name === 'Electives'
                ? 'ELECTIVE'
                : category.name.toUpperCase()}
            </span>

            {/* Mini progress bar - ONE continuous bar like main progress bar */}
            <div
              className={`relative rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 overflow-hidden transition-all duration-200 ${
                isSelected ? 'w-36 h-10' : 'w-32 h-9'
              }`}
            >
              {/* Filled portion (overlaid on top) */}
              <div
                className="absolute inset-0 rounded-xl transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
