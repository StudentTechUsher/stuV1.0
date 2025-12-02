/**
 * Footer component with navigation buttons for wizard
 * Includes Back and Continue buttons with validation state
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WizardFooterProps {
  onBack?: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  isContinueDisabled?: boolean;
  isBackDisabled?: boolean;
  showBack?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({
  onBack,
  onContinue,
  backLabel = 'Back',
  continueLabel = 'Continue',
  isContinueDisabled = false,
  isBackDisabled = false,
  showBack = true,
  isLoading = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-8 mt-8 border-t border-border',
        'justify-between sm:justify-end',
        className
      )}
    >
      {showBack && onBack && (
        <button
          onClick={onBack}
          disabled={isBackDisabled || isLoading}
          className={cn(
            'px-4 py-2.5 rounded-lg',
            'font-body-semi text-sm',
            'border border-border',
            'text-muted-foreground bg-background',
            'transition-all duration-200',
            'hover:border-foreground hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'disabled:hover:border-border disabled:hover:bg-background'
          )}
        >
          {backLabel}
        </button>
      )}

      <button
        onClick={onContinue}
        disabled={isContinueDisabled || isLoading}
        className={cn(
          'px-6 py-2.5 rounded-lg',
          'font-body-semi text-sm',
          'border-none',
          'text-white',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Enabled state
          !isContinueDisabled && !isLoading
            ? 'bg-primary hover:bg-hover-green'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          continueLabel
        )}
      </button>
    </div>
  );
};

export default WizardFooter;
