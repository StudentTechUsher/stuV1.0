'use client';

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WizardProgressBar from './WizardProgressBar';

interface WizardContainerProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onCancel: () => void;
  canProceedNext?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  footerContent?: ReactNode;
}

export default function WizardContainer({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onCancel,
  children,
  footerContent,
}: WizardContainerProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header with thin progress bar */}
      <div className="sticky top-0 z-50 bg-background border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-3">
          {/* Top action bar - close button only */}
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 -mr-2"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Progress indicator */}
          <WizardProgressBar current={currentStep} total={totalSteps} />
        </div>
      </div>

      {/* Main content - vertically centered with maximum width constraint */}
      <div className="flex-1 flex items-center justify-center w-full px-4 py-12 md:py-8">
        <div className="w-full max-w-2xl">
          {/* Question/title area - centered, clean typography */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mt-3 max-w-lg mx-auto leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form/content container */}
          <div className="w-full mb-8">
            {children}
          </div>

          {/* Footer content area (for optional loading states) */}
          {footerContent && (
            <div className="w-full">
              {footerContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
