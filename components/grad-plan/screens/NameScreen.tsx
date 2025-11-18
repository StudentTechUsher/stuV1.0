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
      subtitle="Let's make sure we have this right."
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          disabled={isLoading}
          autoFocus
        />
      </form>
    </WizardFormLayout>
  );
}
