'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

interface StudentTypeScreenProps {
  onSubmit: (studentType: 'undergraduate' | 'honor' | 'graduate') => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function StudentTypeScreen({
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<StudentTypeScreenProps>) {
  const [selected, setSelected] = useState<'undergraduate' | 'honor' | 'graduate' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected) {
      onSubmit(selected);
    }
  };

  const isValid = selected !== null;

  return (
    <WizardFormLayout
      title="What type of student are you?"
      subtitle="This determines your degree options."
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
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 text-base font-medium"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <OptionTile
          title="Undergraduate"
          description="Pursuing a bachelor's degree"
          selected={selected === 'undergraduate'}
          onClick={() => setSelected('undergraduate')}
          disabled={isLoading}
        />
        <OptionTile
          title="Honors"
          description="Undergraduate honors student with additional requirements"
          selected={selected === 'honor'}
          onClick={() => setSelected('honor')}
          disabled={isLoading}
        />
        <OptionTile
          title="Graduate"
          description="Pursuing a master's or doctoral degree"
          selected={selected === 'graduate'}
          onClick={() => setSelected('graduate')}
          disabled={isLoading}
        />
      </form>
    </WizardFormLayout>
  );
}
