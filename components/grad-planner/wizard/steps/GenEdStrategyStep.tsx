/**
 * Step 3: Gen Ed Strategy Selection
 * Only shown for undergraduate students
 * Chooses pacing: early, balanced, or flexible
 */

import React from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { OptionTile } from '../shared/OptionTile';

interface GenEdStrategyStepProps {
  state: WizardState;
  onStrategySelect: (strategy: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const GenEdStrategyStep: React.FC<GenEdStrategyStepProps> = ({
  state,
  onStrategySelect,
  onNext,
  onBack,
}) => {
  const isValid = state.genEdStrategy !== null;

  return (
    <>
      <WizardHeader
        title="How would you like to complete general education?"
        subtext="Choose the pacing that works best for you."
      />

      <div className="space-y-4">
        <OptionTile
          icon="📅"
          label="Early"
          description="Front-load general education courses in early semesters"
          selected={state.genEdStrategy === 'early'}
          onClick={() => onStrategySelect('early')}
        />

        <OptionTile
          icon="⚖️"
          label="Balanced"
          description="Spread general education throughout your semesters"
          selected={state.genEdStrategy === 'balanced'}
          onClick={() => onStrategySelect('balanced')}
        />

        <OptionTile
          icon="🎯"
          label="No Preference"
          description="Let the AI decide the best distribution"
          selected={state.genEdStrategy === 'flexible'}
          onClick={() => onStrategySelect('flexible')}
        />
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        isContinueDisabled={!isValid}
      />
    </>
  );
};

export default GenEdStrategyStep;
