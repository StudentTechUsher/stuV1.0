'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';

interface AdditionalConcernsScreenProps {
  defaultConcerns?: string;
  onSubmit: (concerns: string) => void;
  onSkip: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function AdditionalConcernsScreen({
  defaultConcerns = '',
  onSubmit,
  onSkip,
  onBack,
  isLoading = false,
}: Readonly<AdditionalConcernsScreenProps>) {
  const [concerns, setConcerns] = useState(defaultConcerns);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (concerns.trim()) {
      onSubmit(concerns.trim());
    }
  };

  const isValid = concerns.trim().length > 0;

  return (
    <WizardFormLayout
      title="Any special requests?"
      subtitle="Tell us if there's anything we should know about your graduation plan."
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isLoading}
              className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="px-6 py-2 text-base font-medium bg-primary text-white hover:hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Continuing...' : 'Continue →'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Any specific course preferences, timing constraints, or other concerns..."
          value={concerns}
          onChange={(e) => setConcerns(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
          rows={6}
          disabled={isLoading}
          autoFocus
        />
        <p className="text-xs text-gray-500">
          This information helps us fine-tune your graduation plan.
        </p>
      </form>
    </WizardFormLayout>
  );
}
