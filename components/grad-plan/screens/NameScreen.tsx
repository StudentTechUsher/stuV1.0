'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';

interface NameScreenProps {
  defaultName?: string;
  onSubmit: (name: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function NameScreen({
  defaultName = '',
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<NameScreenProps>) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <WizardFormLayout
      title="What's your name?"
      subtitle="We'll use this to personalize your graduation plan"
      footerButtons={
        <div className="flex gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="px-4 md:px-5 py-2 text-sm font-medium text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            style={{ backgroundColor: 'var(--primary)', color: 'black' }}
            className="px-4 md:px-5 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? 'Continuing...' : 'Continue'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset text-gray-900 placeholder-gray-500 transition-shadow"
          disabled={isLoading}
          autoFocus
        />
      </form>
    </WizardFormLayout>
  );
}
