/**
 * Header component for wizard steps
 * Displays step title, subtext, and optional progress indicator
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WizardHeaderProps {
  title: string;
  subtext?: string;
  showStepIndicator?: boolean;
  currentStep?: number;
  totalSteps?: number;
  className?: string;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  title,
  subtext,
  showStepIndicator = false,
  currentStep = 0,
  totalSteps = 1,
  className,
}) => {
  return (
    <div className={cn('mb-8 space-y-3', className)}>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-header-bold text-foreground leading-tight max-w-2xl">
          {title}
        </h1>
        {showStepIndicator && (
          <div className="text-xs font-body-semi text-muted-foreground whitespace-nowrap pt-1">
            {currentStep + 1} of {totalSteps}
          </div>
        )}
      </div>

      {subtext && (
        <p className="text-sm font-body text-muted-foreground max-w-2xl">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default WizardHeader;
