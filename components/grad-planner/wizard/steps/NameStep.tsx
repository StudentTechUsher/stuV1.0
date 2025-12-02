/**
 * Step 0: Name Confirmation
 * Pre-fills user's name from profile, allows editing if needed
 */

import React, { useState } from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';

interface NameStepProps {
  state: WizardState;
  onNameChange: (name: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

export const NameStep: React.FC<NameStepProps> = ({
  state,
  onNameChange,
  onNext,
  onBack,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(state.studentName);

  const handleSave = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempName(state.studentName);
    }
  };

  return (
    <>
      <WizardHeader
        title="What's your name?"
        subtext="We'll use this to personalize your graduation plan."
      />

      <div className="space-y-6">
        {!isEditing ? (
          <div
            onClick={() => setIsEditing(true)}
            className="p-6 rounded-lg border border-border bg-muted hover:bg-primary-15 hover:border-primary cursor-pointer transition-all duration-200"
          >
            <p className="text-sm font-body text-muted-foreground mb-2">
              Your name
            </p>
            <p className="text-2xl font-header-bold text-foreground">
              {state.studentName || 'Not provided'}
            </p>
            <p className="text-xs font-body text-muted-foreground mt-3">
              Click to edit
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-lg border border-primary focus:outline-none focus:ring-2 focus:ring-primary-15 bg-background text-foreground font-body-semi text-lg"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setTempName(state.studentName);
                }}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-all duration-200 font-body-semi text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!tempName.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-hover-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-body-semi text-sm"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        showBack={false}
        isContinueDisabled={!state.studentName.trim()}
      />
    </>
  );
};

export default NameStep;
