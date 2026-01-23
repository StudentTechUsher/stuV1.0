'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, Edit, ArrowLeft } from 'lucide-react';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import { calculateNextPlanningTerm } from '@/lib/utils/termCalculation';

interface GeneratePlanConfirmationFormProps {
  academicTerms?: AcademicTermsConfig;
  lastCompletedTerm?: string | null;
  preferredStartTerms?: string[];
  onSubmit: (data:
    | { action: 'generate'; mode: 'automatic' | 'active_feedback'; startTerm: string; startYear: number }
    | { action: 'review' }
  ) => void;
}

export default function GeneratePlanConfirmationForm({
  academicTerms,
  lastCompletedTerm,
  preferredStartTerms,
  onSubmit,
}: Readonly<GeneratePlanConfirmationFormProps>) {
  const [selectedMode, setSelectedMode] = useState<'automatic' | 'active_feedback' | null>(null);
  const [showStartTermPrompt, setShowStartTermPrompt] = useState(false);
  const [startTerm, setStartTerm] = useState('');
  const [startYear, setStartYear] = useState('');
  const [startTermError, setStartTermError] = useState<string | null>(null);

  // Calculate the suggested next term based on academic history
  const nextTermCalculation = useMemo(() => {
    return calculateNextPlanningTerm(
      lastCompletedTerm ?? null,
      academicTerms,
      preferredStartTerms
    );
  }, [lastCompletedTerm, academicTerms, preferredStartTerms]);

  const termOptions = useMemo(() => {
    const fallbackTerms = ['Fall', 'Winter', 'Spring', 'Summer'];
    if (!academicTerms) {
      return fallbackTerms.map(term => ({
        id: term.toLowerCase(),
        label: term,
      }));
    }

    const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
    const ordering = academicTerms.ordering && academicTerms.ordering.length > 0
      ? academicTerms.ordering
      : allTerms.map(term => term.id);

    const options = ordering.map(termId => {
      const match = allTerms.find(term =>
        term.id.toLowerCase() === termId.toLowerCase() ||
        term.label.toLowerCase() === termId.toLowerCase()
      );
      const label = match?.label || termId.charAt(0).toUpperCase() + termId.slice(1);
      return {
        id: match?.id || termId,
        label,
      };
    });

    const seen = new Set<string>();
    return options.filter(option => {
      const key = option.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [academicTerms]);

  useEffect(() => {
    if (!showStartTermPrompt) return;

    // Set defaults from calculated next term
    if (!startTerm) {
      setStartTerm(nextTermCalculation.suggestedTerm);
    }
    if (!startYear) {
      setStartYear(String(nextTermCalculation.suggestedYear));
    }
  }, [showStartTermPrompt, startTerm, startYear, nextTermCalculation]);

  const handleModeSelection = (mode: 'automatic' | 'active_feedback') => {
    setSelectedMode(mode);
    setShowStartTermPrompt(true);
    setStartTermError(null);
  };

  const handleBack = () => {
    setShowStartTermPrompt(false);
    setStartTermError(null);
  };

  const handleStartTermSubmit = () => {
    const parsedYear = Number.parseInt(startYear, 10);
    if (!startTerm || Number.isNaN(parsedYear)) {
      setStartTermError('Please select a start term and year to continue.');
      return;
    }
    if (!selectedMode) {
      setStartTermError('Please choose a generation mode first.');
      return;
    }
    onSubmit({
      action: 'generate',
      mode: selectedMode,
      startTerm,
      startYear: parsedYear,
    });
  };

  const parsedStartYear = Number.parseInt(startYear, 10);
  const isStartSelectionValid = !!startTerm && !Number.isNaN(parsedStartYear);

  // Show start term selection after mode is selected
  if (showStartTermPrompt && selectedMode) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            Where should we start your plan?
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {nextTermCalculation.message}
          </p>
        </div>

        <div className="space-y-4">
          {/* Show selected mode */}
          <div className="p-3 rounded-lg bg-muted border border-[var(--border)]">
            <p className="text-xs font-medium text-muted-foreground mb-1">Selected Mode:</p>
            <p className="text-sm font-semibold">
              {selectedMode === 'automatic' ? 'Automatic Generation' : 'Active Feedback'}
            </p>
          </div>

          {/* Term and year selection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Start Term
              </label>
              <select
                value={startTerm}
                onChange={(e) => {
                  setStartTerm(e.target.value);
                  setStartTermError(null);
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="" disabled>Select term</option>
                {termOptions.map(option => (
                  <option key={option.id} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Start Year
              </label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => {
                  setStartYear(e.target.value);
                  setStartTermError(null);
                }}
                min={new Date().getFullYear() - 1}
                max={new Date().getFullYear() + 10}
                className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {startTermError && (
            <p className="text-xs text-red-600">{startTermError}</p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="secondary" onClick={handleBack} className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleStartTermSubmit}
              disabled={!isStartSelectionValid}
            >
              Generate Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Initial mode selection screen
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          Choose How to Generate Your Plan
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Pick a generation style for your first draft. You can still make changes later.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          onClick={() => handleModeSelection('automatic')}
          className={`w-full h-auto items-start justify-start gap-3 p-4 shadow-lg text-left ${
            selectedMode === 'automatic' ? 'border border-[var(--primary)] bg-[var(--primary)]/10' : ''
          }`}
        >
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white">
            <Sparkles size={18} />
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Automatic Generation</div>
            <div className="text-xs text-muted-foreground">
              Generate a full plan in one pass based on your inputs.
            </div>
          </div>
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleModeSelection('active_feedback')}
          className={`w-full h-auto items-start justify-start gap-3 p-4 text-left ${
            selectedMode === 'active_feedback' ? 'border border-[var(--primary)] bg-[var(--primary)]/10' : ''
          }`}
        >
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white">
            <MessageSquare size={18} />
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Active Feedback</div>
            <div className="text-xs text-muted-foreground">
              AI will draft and refine your plan step-by-step with your input.
            </div>
          </div>
        </Button>

        <Button
          variant="secondary"
          onClick={() => onSubmit({ action: 'review' })}
          className="w-full gap-2 justify-start"
        >
          <Edit size={18} />
          Let me review my information first
        </Button>
      </div>
    </div>
  );
}
