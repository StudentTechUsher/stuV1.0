'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { GradPlan } from './types';
import { RedesignedPlanView } from './RedesignedPlanView';

/**
 * GRAD PLAN TESTING WRAPPER
 *
 * Purpose:
 * - Wraps the RedesignedPlanView for testing with mock data
 * - Shows a testing mode banner
 * - Provides context that this is NOT connected to backend
 * - Allows testing the UI/UX with mock data
 * - Manages plan switching
 */
export interface GradPlanRedesignPreviewProps {
  availablePlans: GradPlan[];
}

export function GradPlanRedesignPreview({
  availablePlans,
}: GradPlanRedesignPreviewProps) {
  const [currentPlan, setCurrentPlan] = useState<GradPlan>(availablePlans[0]);

  const handleSelectPlan = (planId: string) => {
    const plan = availablePlans.find((p) => p.planId === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
  };

  const handleCreateNewPlan = () => {
    alert('Testing mode: Create new plan functionality would go here');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Testing Mode Banner - Compact */}
      <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 flex-shrink-0">
          <Info size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-0.5">
            Testing Mode
          </h3>
          <p className="text-xs text-[var(--foreground)] opacity-80">
            Mock data - not connected to backend. Changes won&apos;t be saved.
          </p>
        </div>
      </div>

      {/* Redesigned Plan View */}
      <RedesignedPlanView
        gradPlan={currentPlan}
        availablePlans={availablePlans}
        onSelectPlan={handleSelectPlan}
        onCreateNewPlan={handleCreateNewPlan}
      />
    </div>
  );
}
