'use client';

import React, { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  onBack,
  onCancel,
  canProceedNext = true,
  isLoading = false,
  children,
  footerContent,
}: WizardContainerProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="gap-2 text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-2 max-w-md">{subtitle}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-t border-gray-200">
          <WizardProgressBar current={currentStep} total={totalSteps} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-6 py-12 md:py-16">
          {/* Form Content */}
          <div className="w-full">
            {children}
          </div>
        </div>

        {/* Footer Content (Optional - for loading states, etc.) */}
        {footerContent && (
          <div className="px-6 py-4">
            {footerContent}
          </div>
        )}
      </div>

      {/* Bottom Spacing to prevent content hiding behind fixed footer if needed */}
      <div className="h-4" />
    </div>
  );
}
