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
    <div className="w-full">
      {/* Thin, minimal progress bar - Figma style */}
      <div className="relative h-px bg-gray-200 overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: 'var(--primary)' }}
        />
      </div>

      {/* Optional: subtle step indicator text below */}
      <p className="text-xs text-gray-500 font-medium mt-2">
        Step {current} of {total}
      </p>
    </div>
  );
}
