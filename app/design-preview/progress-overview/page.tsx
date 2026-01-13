'use client';

import React from 'react';
import { ProgressOverviewCard } from '@/components/progress-overview/ProgressOverviewCard';
import { CategoryTabs } from '@/components/progress-overview/CategoryTabs';
import {
  mockFinanceProgress,
  mockGEProgress,
  mockReligionProgress,
  mockElectivesProgress,
  mockAllCategories,
} from '@/components/progress-overview/mockProgressData';

export default function ProgressOverviewPreview() {
  const [selectedCategory, setSelectedCategory] = React.useState('Finance');

  // Add a mock "Minor" category for the navigation
  const mockMinorProgress = {
    name: 'Minor',
    color: '#003D82', // Medium blue - darker than bright but lighter than navy
    totalCredits: 24,
    percentComplete: 45,
    completed: 11,
    inProgress: 3,
    planned: 6,
    remaining: 4,
    requirements: [
      {
        id: 1,
        title: 'Core Requirements',
        description: 'Complete 4 courses',
        progress: 2,
        total: 4,
        status: 'in-progress' as const,
      },
      {
        id: 2,
        title: 'Elective Requirements',
        description: 'Complete 2 courses',
        progress: 1,
        total: 2,
        status: 'in-progress' as const,
      },
    ],
  };

  const allCategoriesWithMinor = [
    mockFinanceProgress,
    mockMinorProgress,
    mockGEProgress,
    mockReligionProgress,
    mockElectivesProgress,
  ];

  const currentCategory = allCategoriesWithMinor.find(
    (cat) => cat.name === selectedCategory
  ) || mockFinanceProgress;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Progress Overview Design Preview
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Visual design matching Figma specifications
          </p>
        </div>

        {/* Light Mode Section with Navigation */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Light Mode - Interactive Navigation
          </h2>

          {/* Category Tabs Navigation */}
          <CategoryTabs
            categories={allCategoriesWithMinor}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Selected Category Card */}
          <ProgressOverviewCard category={currentCategory} />
        </div>

        {/* Dark Mode Section - Interactive */}
        <div className="dark bg-zinc-900 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">
            Dark Mode - Interactive Navigation
          </h2>

          {/* Category Tabs Navigation in Dark Mode */}
          <CategoryTabs
            categories={allCategoriesWithMinor}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Selected Category Card in Dark Mode */}
          <ProgressOverviewCard category={currentCategory} />
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
            Preview Instructions
          </h3>
          <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>Compare this visual design with the Figma screenshot side-by-side</li>
            <li>Check that spacing, sizing, and typography match the target design</li>
            <li>Verify progress bars are thick and prominent with text inside</li>
            <li>Confirm status badges are large circular pills with numbers</li>
            <li>Test dark mode by toggling your system theme</li>
            <li>Test responsive behavior by resizing your browser window</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
