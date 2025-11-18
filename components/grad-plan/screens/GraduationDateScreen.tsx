'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';

interface GraduationDateScreenProps {
  defaultDate?: string;
  onSubmit: (date: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function GraduationDateScreen({
  defaultDate = '',
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<GraduationDateScreenProps>) {
  const [date, setDate] = useState(defaultDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) {
      onSubmit(date);
    }
  };

  const isValid = !!date;

  return (
    <WizardFormLayout
      title="When do you plan to graduate?"
      subtitle="This helps us create the right timeline for your degree."
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
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          disabled={isLoading}
          autoFocus
          required
        />
      </form>
    </WizardFormLayout>
  );
}
