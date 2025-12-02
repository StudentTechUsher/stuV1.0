/**
 * Step 5: Course Selection (Manual Mode Only)
 * User selects specific courses for each requirement
 */

import React, { useMemo } from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { StyledSelect, SelectOption } from '../shared/StyledSelect';
import { cn } from '@/lib/utils';

export interface Requirement {
  id: string;
  name: string;
  subtitle?: string;
  courses: Array<{ code: string; title: string; credits: number }>;
  slotsNeeded: number;
}

interface CourseSelectionStepProps {
  state: WizardState;
  requirements: Requirement[];
  onCourseSelect: (requirement: string, courses: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  isLoadingRequirements?: boolean;
}

export const CourseSelectionStep: React.FC<CourseSelectionStepProps> = ({
  state,
  requirements,
  onCourseSelect,
  onNext,
  onBack,
  isLoadingRequirements = false,
}) => {
  // Check if all requirements are filled
  const isValid = useMemo(() => {
    if (requirements.length === 0) return false;

    return requirements.every((req) => {
      const selected = state.selectedCourses[req.subtitle || req.id] || [];
      return (
        selected.length >= req.slotsNeeded &&
        selected.every((course) => course && course.trim() !== '')
      );
    });
  }, [requirements, state.selectedCourses]);

  if (isLoadingRequirements) {
    return (
      <>
        <WizardHeader
          title="Loading requirements..."
          subtext="We're preparing your course options."
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
              Loading requirements...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (requirements.length === 0) {
    return (
      <>
        <WizardHeader title="No requirements found" />
        <div className="py-12 text-center">
          <p className="text-muted-foreground font-body">
            No course requirements for your selected programs.
          </p>
        </div>
        <WizardFooter
          onContinue={onNext}
          onBack={onBack}
          continueLabel="Skip to Electives"
        />
      </>
    );
  }

  return (
    <>
      <WizardHeader
        title="Select courses for each requirement."
        subtext="Pick one course per requirement slot to complete your plan."
      />

      <div className="space-y-8">
        {requirements.map((requirement) => {
          const requirementKey = requirement.subtitle || requirement.id;
          const selectedCourses = state.selectedCourses[requirementKey] || [];
          const courseOptions: SelectOption[] = requirement.courses.map(
            (course) => ({
              label: `${course.code} - ${course.title}`,
              value: course.code,
              description: `${course.credits} credits`,
            })
          );

          return (
            <div key={requirement.id} className="space-y-4 p-4 rounded-lg border border-border">
              <div>
                <h3 className="font-body-semi text-base text-foreground">
                  {requirement.name}
                </h3>
                {requirement.subtitle && (
                  <p className="text-xs font-body text-muted-foreground mt-1">
                    {requirement.subtitle}
                  </p>
                )}
              </div>

              {/* Multiple slots for requirement */}
              <div className="space-y-3">
                {Array.from({ length: requirement.slotsNeeded }).map(
                  (_, idx) => (
                    <div key={idx}>
                      <StyledSelect
                        label={`Selection ${idx + 1}`}
                        value={selectedCourses[idx] || ''}
                        onChange={(value) => {
                          const newSelection = [...selectedCourses];
                          newSelection[idx] = value;
                          onCourseSelect(requirementKey, newSelection);
                        }}
                        options={courseOptions}
                        placeholder={`Select course ${idx + 1}...`}
                        required
                      />
                    </div>
                  )
                )}
              </div>

              {/* Validation indicator */}
              <div
                className={cn(
                  'flex items-center gap-2 text-xs font-body pt-2',
                  selectedCourses.length >= requirement.slotsNeeded &&
                    selectedCourses.every((c) => c && c.trim() !== '')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {selectedCourses.length >= requirement.slotsNeeded &&
                  selectedCourses.every((c) => c && c.trim() !== '') ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Complete
                  </>
                ) : (
                  <>
                    <span>
                      {selectedCourses.length}/{requirement.slotsNeeded} selected
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <WizardFooter
        onContinue={onNext}
        onBack={onBack}
        isContinueDisabled={!isValid}
      />
    </>
  );
};

export default CourseSelectionStep;
