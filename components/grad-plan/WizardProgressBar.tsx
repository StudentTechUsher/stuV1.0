'use client';

import React from 'react';

interface WizardProgressBarProps {
  current: number;
  total: number;
}

export default function WizardProgressBar({
  current,
  total,
}: WizardProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full space-y-2">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step Indicator Text */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 font-medium">
          Step {current} of {total}
        </p>
        <p className="text-xs text-gray-600 font-medium">
          {percentage}%
        </p>
      </div>
    </div>
  );
}
