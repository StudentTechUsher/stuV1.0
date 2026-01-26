/**
 * Step 2: Program Selection
 * Select majors, minors, and other programs
 */

import React, { useState, useMemo } from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { OptionTile } from '../shared/OptionTile';

interface Program {
  id: string;
  name: string;
  type: 'major' | 'minor' | 'concentration';
}

interface ProgramStepProps {
  state: WizardState;
  onProgramsSelect: (programs: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  availablePrograms?: Program[];
  isLoadingPrograms?: boolean;
}

export const ProgramStep: React.FC<ProgramStepProps> = ({
  state,
  onProgramsSelect,
  onNext,
  onBack,
  availablePrograms = [],
  isLoadingPrograms = false,
}) => {
  const [localPrograms, setLocalPrograms] = useState<string[]>(
    state.selectedPrograms
  );

  const toggleProgram = (programId: string, programType: string) => {
    setLocalPrograms((prev) => {
      if (prev.includes(programId)) {
        // Always allow deselecting
        return prev.filter((id) => id !== programId);
      }

      // Count how many of this type are already selected
      const currentPrograms = availablePrograms || [];
      const selectedOfType = prev.filter((id) => {
        const program = currentPrograms.find((p) => p.id === id);
        return program?.type === programType;
      }).length;

      // Check limits
      const maxPerType = 3;
      if (selectedOfType >= maxPerType) {
        return prev; // Don't add more
      }

      return [...prev, programId];
    });
  };

  const handleContinue = () => {
    onProgramsSelect(localPrograms);
    onNext();
  };

  const isValid = localPrograms.length > 0;

  if (isLoadingPrograms) {
    return (
      <>
        <WizardHeader
          title="Select your programs..."
          subtext="Loading available programs..."
        />
        <div className="py-12 flex justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm font-body text-muted-foreground">
              Loading programs...
            </p>
          </div>
        </div>
      </>
    );
  }

  // Group programs by type
  const majors = availablePrograms.filter((p) => p.type === 'major');
  const minors = availablePrograms.filter((p) => p.type === 'minor');
  const concentrations = availablePrograms.filter(
    (p) => p.type === 'concentration'
  );

  return (
    <>
      <WizardHeader
        title="Select your major and any minors."
        subtext="You can pick multiple programs."
      />

      <div className="space-y-8">
        {/* Majors */}
        {majors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-body-semi text-muted-foreground uppercase tracking-wide">
              Major {`(Max 3)`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {majors.map((program) => {
                const isSelected = localPrograms.includes(program.id);
                const majorsCount = localPrograms.filter((id) => {
                  const prog = availablePrograms?.find((p) => p.id === id);
                  return prog?.type === 'major';
                }).length;
                const isDisabled = !isSelected && majorsCount >= 3;

                return (
                  <OptionTile
                    key={program.id}
                    icon="🎯"
                    label={program.name}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggleProgram(program.id, 'major')}
                    multiSelect
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Minors */}
        {minors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-body-semi text-muted-foreground uppercase tracking-wide">
              Minor {`(Max 3)`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {minors.map((program) => {
                const isSelected = localPrograms.includes(program.id);
                const minorsCount = localPrograms.filter((id) => {
                  const prog = availablePrograms?.find((p) => p.id === id);
                  return prog?.type === 'minor';
                }).length;
                const isDisabled = !isSelected && minorsCount >= 3;

                return (
                  <OptionTile
                    key={program.id}
                    icon="📚"
                    label={program.name}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggleProgram(program.id, 'minor')}
                    multiSelect
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Concentrations */}
        {concentrations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-body-semi text-muted-foreground uppercase tracking-wide">
              Concentration {`(Max 3)`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {concentrations.map((program) => {
                const isSelected = localPrograms.includes(program.id);
                const concentrationsCount = localPrograms.filter((id) => {
                  const prog = availablePrograms?.find((p) => p.id === id);
                  return prog?.type === 'concentration';
                }).length;
                const isDisabled = !isSelected && concentrationsCount >= 3;

                return (
                  <OptionTile
                    key={program.id}
                    icon="⭐"
                    label={program.name}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggleProgram(program.id, 'concentration')}
                    multiSelect
                  />
                );
              })}
            </div>
          </div>
        )}

        {availablePrograms.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-body">
              No programs available for your institution.
            </p>
          </div>
        )}
      </div>

      <WizardFooter
        onContinue={handleContinue}
        onBack={onBack}
        isContinueDisabled={!isValid}
      />
    </>
  );
};

export default ProgramStep;
