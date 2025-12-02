/**
 * Layout wrapper for wizard content
 * Can be used as standalone page or inside a modal/dialog
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WizardFrameProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const WizardFrame: React.FC<WizardFrameProps> = ({
  children,
  className,
  containerClassName,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen bg-background flex items-center justify-center',
        'p-4 sm:p-6 lg:p-8',
        'pt-8', // Account for fixed progress bar
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-2xl',
          'bg-background rounded-lg',
          'space-y-6',
          containerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default WizardFrame;
