'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';

interface CareerGoalsScreenProps {
  defaultGoals?: string;
  onSubmit: (goals: string) => void;
  onSkip: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function CareerGoalsScreen({
  defaultGoals = '',
  onSubmit,
  onSkip,
  onBack,
  isLoading = false,
}: Readonly<CareerGoalsScreenProps>) {
  const [goals, setGoals] = useState(defaultGoals);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goals.trim()) {
      onSubmit(goals.trim());
    }
  };

  const isValid = goals.trim().length > 0;

  return (
    <WizardFormLayout
      title="What are your career goals?"
      subtitle="Optional, but helps us suggest better courses for you."
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
              className="px-6 py-2 text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Continuing...' : 'Continue →'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Tell us about your career aspirations..."
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
          rows={5}
          disabled={isLoading}
          autoFocus
        />
      </form>
    </WizardFormLayout>
  );
}
