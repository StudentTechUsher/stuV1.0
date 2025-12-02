/**
 * Thin Figma-style progress bar for wizard navigation
 * Advances smoothly as user progresses through steps
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  className,
}) => {
  // Calculate progress percentage with next-step bias
  // (show progress as advancing to next step, not from current)
  const progress = useMemo(() => {
    return ((currentStep + 1) / totalSteps) * 100;
  }, [currentStep, totalSteps]);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-1 bg-muted overflow-hidden',
        className
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
