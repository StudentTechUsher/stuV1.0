'use client';

import React from 'react';
import { ProgressOverviewContainer } from '@/components/progress-overview/ProgressOverviewContainer';
import { mockAllCategoriesWithMinor } from '@/components/progress-overview/mockProgressData';

export default function ProgressOverviewPreview() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Progress Overview Design Preview
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Click OVERALL to see overall progress, or click any section to see details
          </p>
        </div>

        {/* Unified Progress Overview - Light Mode */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Light Mode - Interactive
          </h2>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-sm">
            <ProgressOverviewContainer categories={mockAllCategoriesWithMinor} />
          </div>
        </div>

        {/* Unified Progress Overview - Dark Mode */}
        <div className="dark bg-zinc-900 p-8 rounded-2xl mb-12">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">
            Dark Mode - Interactive
          </h2>
          <ProgressOverviewContainer categories={mockAllCategoriesWithMinor} />
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
            Preview Instructions
          </h3>
          <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>Click <strong>OVERALL</strong> tab to see the overall degree progress view</li>
            <li>Click any section card (MAJOR, GE, etc.) to navigate to that category</li>
            <li>Use the category tabs at the top to switch between views</li>
            <li>The OVERALL tab uses black/grey/white theme for the overall progress bar</li>
            <li>Category views use their respective colors</li>
            <li>Test dark mode by toggling your system theme</li>
            <li>Test responsive behavior by resizing your browser window</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
