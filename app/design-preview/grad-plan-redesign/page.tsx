'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { GradPlanRedesignPreview } from '@/components/grad-planner-redesign/GradPlanRedesignPreview';
import { mockGradPlans } from '@/components/grad-planner-redesign/mockGradPlanData';

/**
 * GRAD PLAN REDESIGN PREVIEW PAGE
 *
 * Purpose:
 * - Dedicated page to preview the redesigned graduation planner
 * - Uses mock data (no backend connection)
 * - Allows iteration on visual design before integration
 * - Includes dark mode toggle for testing
 *
 * URL: http://localhost:3000/design-preview/grad-plan-redesign
 */
export default function GradPlanRedesignPreviewPage() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Page Header - Compact */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--foreground)] mb-1 tracking-tight">
              Grad Plan Redesign Preview
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Preview of new graduation planner design - using mock data, not connected to backend
            </p>
          </div>

          {/* Dark Mode Toggle - Compact */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            type="button"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <>
                <Sun size={14} className="text-[var(--foreground)]" />
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  Light
                </span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-[var(--foreground)]" />
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  Dark
                </span>
              </>
            )}
          </button>
        </div>

        {/* Preview Component */}
        <GradPlanRedesignPreview availablePlans={mockGradPlans} />

        {/* Footer Note - Compact */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-2">
            Design Principles Applied
          </h3>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-[var(--foreground)]">
            <li>
              <strong>Status Colors:</strong> Completed (green), In-Progress (transparent green), Planned (grey), Remaining (white)
            </li>
            <li>
              <strong>Requirement Colors:</strong> Major (green), GE (blue), Religion (indigo), Electives (magenta)
            </li>
            <li>
              <strong>Layout:</strong> 2-column grid for terms - see full year at once
            </li>
            <li>
              <strong>Interaction:</strong> Drag courses between terms, switch plans, edit names inline
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
