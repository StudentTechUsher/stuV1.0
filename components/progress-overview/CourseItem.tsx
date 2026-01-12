'use client';

import React from 'react';
import type { Course } from './types';
import {
  getCompletedCardBg,
  getCompletedCardBorder,
  getInProgressCardBg,
  getInProgressCardBorder,
  getPlannedColor,
  getPlannedColorDark,
} from './colorUtils';

interface CourseItemProps {
  course: Course;
  categoryColor: string;
}

export function CourseItem({ course, categoryColor }: CourseItemProps) {
  const { code, title, credits, status } = course;

  // Card styling based on status - color the ENTIRE card
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in-progress';
  const isPlanned = status === 'planned';
  const isRemaining = status === 'remaining';

  const getCardBackground = () => {
    if (isCompleted) return getCompletedCardBg(categoryColor);
    if (isInProgress) return getInProgressCardBg(categoryColor);
    if (isPlanned) return getPlannedColor();
    return 'white';
  };

  const getCardBackgroundDark = () => {
    if (isCompleted) return getCompletedCardBg(categoryColor); // Same solid color
    if (isInProgress) return getInProgressCardBg(categoryColor); // Same 50% transparent
    if (isPlanned) return getPlannedColorDark(); // Dark mode grey
    return 'rgb(39 39 42)'; // zinc-800
  };

  const getCardBorder = () => {
    if (isCompleted) return getCompletedCardBorder(categoryColor);
    if (isInProgress) return getInProgressCardBorder(categoryColor);
    if (isPlanned) return getPlannedColor();
    return 'rgb(228 228 231)'; // zinc-200
  };

  const getCardBorderDark = () => {
    if (isCompleted) return getCompletedCardBorder(categoryColor);
    if (isInProgress) return getInProgressCardBorder(categoryColor);
    if (isPlanned) return getPlannedColorDark();
    return 'rgb(63 63 70)'; // zinc-700
  };

  // Text color - completed and in-progress should have black text on bright background
  const getTextColorClass = () => {
    if (isRemaining) return 'text-zinc-500 dark:text-zinc-400';
    if (isCompleted) return 'text-black'; // Black text on bright green
    return 'text-[var(--foreground)]';
  };

  return (
    <>
      {/* Light mode */}
      <div
        className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors dark:hidden ${getTextColorClass()}`}
        style={{
          backgroundColor: getCardBackground(),
          borderColor: getCardBorder(),
        }}
      >
        <div className="flex flex-col">
          <span className="text-sm font-bold">{code}</span>
          <span className="text-xs opacity-80">{title}</span>
        </div>
        <span className="text-xs font-semibold opacity-70">{credits} cr</span>
      </div>

      {/* Dark mode */}
      <div
        className={`hidden dark:flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${getTextColorClass()}`}
        style={{
          backgroundColor: getCardBackgroundDark(),
          borderColor: getCardBorderDark(),
        }}
      >
        <div className="flex flex-col">
          <span className="text-sm font-bold">{code}</span>
          <span className="text-xs opacity-80">{title}</span>
        </div>
        <span className="text-xs font-semibold opacity-70">{credits} cr</span>
      </div>
    </>
  );
}
