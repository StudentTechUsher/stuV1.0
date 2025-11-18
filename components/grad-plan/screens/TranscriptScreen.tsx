'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

interface TranscriptScreenProps {
  onSubmit: (hasTranscript: boolean) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function TranscriptScreen({
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<TranscriptScreenProps>) {
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected !== null) {
      onSubmit(selected === 'yes');
    }
  };

  const isValid = selected !== null;

  return (
    <WizardFormLayout
      title="Do you have a transcript on file?"
      subtitle="This helps us see what you've already completed."
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
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <OptionTile
          title="Yes, I have one"
          description="I have a transcript uploaded"
          selected={selected === 'yes'}
          onClick={() => setSelected('yes')}
          disabled={isLoading}
        />
        <OptionTile
          title="No, I don't"
          description="I haven't uploaded a transcript yet"
          selected={selected === 'no'}
          onClick={() => setSelected('no')}
          disabled={isLoading}
        />
      </form>
    </WizardFormLayout>
  );
}
