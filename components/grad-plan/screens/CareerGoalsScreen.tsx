'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

interface CareerGoalsScreenProps {
  _defaultGoals?: string;
  onSubmit: (goals: string) => void;
  onSkip: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const INDUSTRIES = [
  'Technology & Software',
  'Healthcare & Medical',
  'Finance & Business',
  'Engineering & Manufacturing',
  'Education & Training',
  'Creative & Media',
];

type Step = 'industry-selection' | 'commitment-level';

export default function CareerGoalsScreen({
  _defaultGoals = '',
  onSubmit,
  onSkip,
  onBack,
  isLoading = false,
}: Readonly<CareerGoalsScreenProps>) {
  const [step, setStep] = useState<Step>('industry-selection');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState('');
  const [commitment, setCommitment] = useState<number | null>(null);

  const handleIndustryToggle = useCallback((industry: string) => {
    setSelectedIndustries(prev => {
      const newSelection = prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry];

      // Limit to 2 selections
      return newSelection.slice(-2);
    });
  }, []);

  const handleIndustrySubmit = useCallback(() => {
    if (selectedIndustries.length === 0 && !customIndustry.trim()) {
      return;
    }
    setStep('commitment-level');
  }, [selectedIndustries, customIndustry]);

  const handleCommitmentSubmit = useCallback(() => {
    if (commitment === null) {
      return;
    }

    const finalGoals = [
      ...selectedIndustries,
      ...(customIndustry.trim() ? [customIndustry.trim()] : []),
      `Commitment Level: ${commitment}/10`,
    ].join(' | ');

    onSubmit(finalGoals);
  }, [selectedIndustries, customIndustry, commitment, onSubmit]);

  const isIndustryStepValid = selectedIndustries.length > 0 || customIndustry.trim().length > 0;
  const isCommitmentValid = commitment !== null;

  // Step 1: Industry Selection
  if (step === 'industry-selection') {
    return (
      <WizardFormLayout
        title="What industries interest you?"
        subtitle="Select up to 2 industries that align with your career goals, or enter your own."
        footerButtons={
          <div className="flex gap-3 justify-between">
            <Button
              variant="secondary"
              onClick={onBack}
              disabled={isLoading}
              className="px-6 py-2 text-base font-medium"
            >
              ← Back
            </Button>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={onSkip}
                disabled={isLoading}
                className="px-6 py-2 text-base font-medium"
              >
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={handleIndustrySubmit}
                disabled={!isIndustryStepValid || isLoading}
                className="px-6 py-2 text-base font-medium"
              >
                {isLoading ? 'Continuing...' : 'Continue →'}
              </Button>
            </div>
          </div>
        }
      >
        <form className="space-y-4">
          <div className="space-y-3">
            {INDUSTRIES.map(industry => (
              <OptionTile
                key={industry}
                title={industry}
                selected={selectedIndustries.includes(industry)}
                onClick={() => handleIndustryToggle(industry)}
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Custom industry input */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or enter your own industry:
            </label>
            <input
              type="text"
              placeholder="e.g., Data Science, Nursing, Environmental Science..."
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={isLoading}
            />
          </div>

          {/* Selection counter */}
          {(selectedIndustries.length > 0 || customIndustry.trim()) && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedIndustries.length > 0 && `${selectedIndustries.length}/2 selected`}
              {selectedIndustries.length > 0 && customIndustry.trim() && ' + '}
              {customIndustry.trim() && `custom: "${customIndustry.trim()}"`}
            </div>
          )}
        </form>
      </WizardFormLayout>
    );
  }

  // Step 2: Commitment Level
  return (
    <WizardFormLayout
      title="How committed are you?"
      subtitle="On a scale of 1-10, how committed are you to this career path?"
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={() => setStep('industry-selection')}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium"
          >
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={handleCommitmentSubmit}
            disabled={!isCommitmentValid || isLoading}
            className="px-6 py-2 text-base font-medium"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <div className="flex justify-between gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              type="button"
              onClick={() => setCommitment(num)}
              disabled={isLoading}
              className={`flex-1 py-3 px-2 rounded-lg font-semibold transition-colors ${
                commitment === num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Not committed</span>
          <span>Very committed</span>
        </div>
      </form>
    </WizardFormLayout>
  );
}
