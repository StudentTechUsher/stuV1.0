/**
 * Step 1: Student Type Selection
 * Select between undergraduate or graduate
 */

import React, { useState } from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { OptionTile } from '../shared/OptionTile';
import { MicroInput } from '../shared/MicroInput';

interface StudentTypeStepProps {
  state: WizardState;
  onTypeSelect: (type: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StudentTypeStep: React.FC<StudentTypeStepProps> = ({
  state,
  onTypeSelect,
  onNext,
  onBack,
}) => {
  const [otherType, setOtherType] = useState('');

  const isOtherSelected = state.studentType === 'other';
  const isValid =
    state.studentType && (!isOtherSelected || otherType.trim().length > 0);

  const handleTypeSelect = (type: string) => {
    if (type === 'other') {
      onTypeSelect('other');
      setOtherType('');
    } else {
      onTypeSelect(type);
      setOtherType('');
    }
  };

  return (
    <>
      <WizardHeader
        title="What type of student are you?"
        subtext="This helps us tailor your graduation plan."
      />

      <div className="space-y-4">
        <OptionTile
          icon="🎓"
          label="Undergraduate"
          description="Working toward a bachelor's degree"
          selected={state.studentType === 'undergraduate'}
          onClick={() => handleTypeSelect('undergraduate')}
        />

        <OptionTile
          icon="📚"
          label="Graduate"
          description="Pursuing a master's or doctoral degree"
          selected={state.studentType === 'graduate'}
          onClick={() => handleTypeSelect('graduate')}
        />

        <OptionTile
          icon="❓"
          label="Other"
          description="Something else or unsure"
          selected={isOtherSelected}
          onClick={() => handleTypeSelect('other')}
        />

        {isOtherSelected && (
          <MicroInput
            value={otherType}
            onChange={setOtherType}
            placeholder="Tell us about your student type..."
          />
        )}
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        isContinueDisabled={!isValid}
      />
    </>
  );
};

export default StudentTypeStep;
