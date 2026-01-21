'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { ProgressCategory, OverallProgress } from './types';
import { MainProgressOverview } from './MainProgressOverview';
import { ProgressOverviewCard } from './ProgressOverviewCard';
import { CategoryTabs, OVERALL_VIEW } from './CategoryTabs';
import { computeMainProgressData } from './mainProgressAdapter';

interface ProgressOverviewContainerProps {
  /** Array of all progress categories (Major, GE, Religion, etc.) */
  categories: ProgressCategory[];
  /** Initial view - defaults to OVERALL */
  initialView?: string;
  /** Use compact sizing for sidebar/narrow spaces */
  compact?: boolean;
  /** Optional override for overall progress calculation */
  overallProgress?: OverallProgress;
}

/**
 * ProgressOverviewContainer - Unified container that manages navigation between:
 * - OVERALL view: Overall degree progress with section cards
 * - Category views: Detailed progress for each section
 *
 * Clicking a section card in OVERALL view navigates to that category.
 * The CategoryTabs always shows an OVERALL tab to return to the overview.
 */
export function ProgressOverviewContainer({
  categories,
  initialView = OVERALL_VIEW,
  compact = false,
  overallProgress,
}: ProgressOverviewContainerProps) {
  const [selectedView, setSelectedView] = useState(initialView);

  // Compute main progress data from categories
  const mainProgressData = useMemo(
    () => computeMainProgressData(categories),
    [categories]
  );
  const resolvedOverallProgress = overallProgress ?? mainProgressData.overallProgress;

  // Handle section click from MainProgressOverview
  const handleSectionClick = useCallback((sectionName: string) => {
    setSelectedView(sectionName);
  }, []);

  // Handle tab selection
  const handleSelectCategory = useCallback((categoryName: string) => {
    setSelectedView(categoryName);
  }, []);

  // Find the selected category (if not OVERALL view)
  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.name === selectedView),
    [categories, selectedView]
  );

  const isOverallView = selectedView === OVERALL_VIEW;

  return (
    <div className="w-full">
      {/* Category Tabs Navigation - always visible */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedView}
        onSelectCategory={handleSelectCategory}
        showOverallTab
        overallProgressPercent={resolvedOverallProgress.percentComplete}
      />

      {/* Content Area */}
      {isOverallView ? (
        <MainProgressOverview
          overallProgress={resolvedOverallProgress}
          sectionProgress={mainProgressData.sectionProgress}
          onSectionClick={handleSectionClick}
        />
      ) : selectedCategory ? (
        <ProgressOverviewCard
          category={selectedCategory}
          compact={compact}
        />
      ) : null}
    </div>
  );
}
