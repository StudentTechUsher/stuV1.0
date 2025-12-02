/**
 * Step 4: Plan Mode Decision
 * Choose between automatic (AI-driven) or manual (user-selected) course planning
 */

import React from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { OptionTile } from '../shared/OptionTile';

interface PlanModeStepProps {
  state: WizardState;
  onModeSelect: (mode: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PlanModeStep: React.FC<PlanModeStepProps> = ({
  state,
  onModeSelect,
  onNext,
  onBack,
}) => {
  const isValid = state.planMode !== null;

  return (
    <>
      <WizardHeader
        title="How should we organize your courses?"
        subtext="Choose automatic to let AI organize, or manual to pick specific courses."
      />

      <div className="space-y-4">
        <OptionTile
          icon="⚡"
          label="Automatic"
          description="Let AI intelligently select and organize courses for you"
          selected={state.planMode === 'AUTO'}
          onClick={() => onModeSelect('AUTO')}
        />

        <OptionTile
          icon="🎯"
          label="Manual"
          description="Pick specific courses for each requirement yourself"
          selected={state.planMode === 'MANUAL'}
          onClick={() => onModeSelect('MANUAL')}
        />
      </div>

      <div className="p-4 rounded-lg bg-primary-15 border border-primary-22">
        <p className="text-sm font-body text-foreground">
          💡{' '}
          <span className="font-body-semi">
            {state.planMode === 'MANUAL'
              ? "You'll select specific courses for each requirement on the next step."
              : state.planMode === 'AUTO'
                ? "We'll intelligently choose the best courses for your situation."
                : 'Choose an option to continue.'}
          </span>
        </p>
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        isContinueDisabled={!isValid}
      />
    </>
  );
};

export default PlanModeStep;
