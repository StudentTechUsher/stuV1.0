'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

const SEMESTERS = ['Winter', 'Spring', 'Summer', 'Fall'] as const;

interface GraduationSemesterScreenProps {
  defaultSemester?: string;
  onSubmit: (semester: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function GraduationSemesterScreen({
  defaultSemester = '',
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<GraduationSemesterScreenProps>) {
  const [semester, setSemester] = useState(defaultSemester);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (semester) {
      onSubmit(semester);
    }
  };

  const isValid = !!semester;

  return (
    <WizardFormLayout
      title="Which semester?"
      subtitle="When do you want to finish?"
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            ← Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 text-base font-medium bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {SEMESTERS.map((sem) => (
          <OptionTile
            key={sem}
            title={sem}
            selected={semester === sem}
            onClick={() => setSemester(sem)}
            disabled={isLoading}
          />
        ))}
      </form>
    </WizardFormLayout>
  );
}
