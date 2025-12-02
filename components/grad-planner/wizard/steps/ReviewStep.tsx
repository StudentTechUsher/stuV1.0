/**
 * Step 7: Review and Submit
 * Final confirmation of all selections before plan creation
 * Includes plan naming
 */

import React, { useState } from 'react';
import { WizardState } from '../types';
import { WizardHeader } from '../WizardHeader';
import { WizardFooter } from '../WizardFooter';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  state: WizardState;
  onPlanNameChange: (name: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  error?: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  state,
  onPlanNameChange,
  onSubmit,
  onBack,
  isSubmitting = false,
  error,
}) => {
  const [planName, setPlanName] = useState(
    state.planName || `${state.studentName}'s Graduation Plan`
  );

  const handlePlanNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlanName(e.target.value);
    onPlanNameChange(e.target.value);
  };

  const coursesCount = Object.values(state.selectedCourses).reduce(
    (acc, courses) => acc + courses.length,
    0
  );

  return (
    <>
      <WizardHeader
        title="Ready to create your graduation plan?"
        subtext="Review your selections below."
      />

      <div className="space-y-8">
        {/* Plan Name Input */}
        <div className="space-y-3">
          <label className="block font-body-semi text-sm text-foreground">
            Plan Name (Optional)
          </label>
          <input
            type="text"
            value={planName}
            onChange={handlePlanNameChange}
            placeholder="e.g., Fall 2024 Plan, 4-Year Path"
            maxLength={120}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'font-body text-sm',
              'bg-background text-foreground placeholder:text-muted-foreground',
              'transition-all duration-200',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-15',
              'border-border hover:border-primary'
            )}
          />
          <p className="text-xs font-body text-muted-foreground">
            {planName.length} / 120 characters
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Student Info */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <h3 className="font-body-semi text-sm text-muted-foreground uppercase">
              Student
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-body text-muted-foreground">Name</p>
                <p className="font-body-semi text-sm text-foreground">
                  {state.studentName || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-xs font-body text-muted-foreground">Type</p>
                <p className="font-body-semi text-sm text-foreground capitalize">
                  {state.studentType || 'Not selected'}
                </p>
              </div>
            </div>
          </div>

          {/* Programs */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <h3 className="font-body-semi text-sm text-muted-foreground uppercase">
              Programs
            </h3>
            {state.selectedPrograms.length > 0 ? (
              <ul className="space-y-1">
                {state.selectedPrograms.map((program) => (
                  <li
                    key={program}
                    className="text-sm font-body text-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{program}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-body text-muted-foreground">
                No programs selected
              </p>
            )}
          </div>

          {/* Plan Settings */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <h3 className="font-body-semi text-sm text-muted-foreground uppercase">
              Settings
            </h3>
            <div className="space-y-2">
              {state.studentType === 'undergraduate' && (
                <div>
                  <p className="text-xs font-body text-muted-foreground">
                    Gen Ed Strategy
                  </p>
                  <p className="font-body-semi text-sm text-foreground capitalize">
                    {state.genEdStrategy || 'Not selected'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-body text-muted-foreground">
                  Planning Mode
                </p>
                <p className="font-body-semi text-sm text-foreground">
                  {state.planMode === 'AUTO' ? 'Automatic' : 'Manual'}
                </p>
              </div>
            </div>
          </div>

          {/* Course Summary */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <h3 className="font-body-semi text-sm text-muted-foreground uppercase">
              Courses
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-body text-muted-foreground">
                  Selected Courses
                </p>
                <p className="font-body-semi text-sm text-foreground">
                  {coursesCount} course{coursesCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs font-body text-muted-foreground">
                  Electives
                </p>
                <p className="font-body-semi text-sm text-foreground">
                  {state.userElectives.length}{' '}
                  course{state.userElectives.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-primary-15 border border-primary-22">
          <p className="text-sm font-body text-foreground">
            💡{' '}
            <span className="font-body-semi">
              Your plan will be submitted for advisor review. You'll receive an
              email notification once it's ready.
            </span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
            <p className="text-sm font-body-semi text-destructive">{error}</p>
          </div>
        )}
      </div>

      <WizardFooter
        onContinue={onSubmit}
        onBack={onBack}
        continueLabel="Create Plan"
        isLoading={isSubmitting}
        isContinueDisabled={isSubmitting}
      />
    </>
  );
};

export default ReviewStep;
