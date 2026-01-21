'use client';

import { Check } from 'lucide-react';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import { getStepLabel } from '@/lib/chatbot/grad-plan/stateManager';

interface ConversationProgressStepsProps {
  currentStep: ConversationStep;
  completedSteps: ConversationStep[];
  onStepClick?: (step: ConversationStep) => void;
}

// Main visible steps for the progress indicator (NEW: reduced from 9 to 6 steps)
const MAIN_STEPS: ConversationStep[] = [
  ConversationStep.PROFILE_CHECK,           // NEW: Replaces profile_setup, career_selection, student_type
  ConversationStep.PROGRAM_SELECTION,       // Unchanged
  ConversationStep.COURSE_SELECTION,        // Unchanged
  ConversationStep.CREDIT_DISTRIBUTION,     // NEW: Credit strategy selection
  ConversationStep.MILESTONES_AND_CONSTRAINTS, // NEW: Replaces milestones + additional_concerns
  ConversationStep.GENERATING_PLAN,         // Unchanged
];

export default function ConversationProgressSteps({
  currentStep,
  completedSteps,
  onStepClick,
}: Readonly<ConversationProgressStepsProps>) {
  const getStepStatus = (step: ConversationStep): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(step)) {
      return 'completed';
    }
    if (step === currentStep) {
      return 'current';
    }
    return 'upcoming';
  };

  const handleStepClick = (step: ConversationStep) => {
    const status = getStepStatus(step);
    // Only allow clicking on completed steps
    if (status === 'completed' && onStepClick) {
      onStepClick(step);
    }
  };

  const currentStepIndex = MAIN_STEPS.indexOf(currentStep);

  return (
    <div className="w-full py-2 pb-8">
      {/* Mobile: Show current step only */}
      <div className="block lg:hidden">
        <div className="text-center mb-3">
          <p className="text-xs text-muted-foreground mb-1">
            Step {Math.max(1, currentStepIndex + 1)} of {MAIN_STEPS.length}
          </p>
          <p className="text-sm font-semibold">{getStepLabel(currentStep)}</p>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${((currentStepIndex + 1) / MAIN_STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: Progress bar with pipes */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-0">
          {MAIN_STEPS.map((step, index) => {
            const status = getStepStatus(step);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            const isLast = index === MAIN_STEPS.length - 1;

            return (
              <div key={step} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center relative">
                  <div
                    onClick={() => handleStepClick(step)}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      border-3 transition-all duration-300 relative
                      ${
                        isCompleted
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-black shadow-md cursor-pointer hover:scale-125 hover:shadow-xl hover:ring-2 hover:ring-[var(--primary)] hover:ring-offset-2'
                          : isCurrent
                          ? 'bg-white border-[var(--primary)] text-[var(--primary)] shadow-sm border-[2px]'
                          : 'bg-white border-gray-300 text-gray-400 border-[1.5px]'
                      }
                    `}
                    title={isCompleted ? `Click to return to ${getStepLabel(step)}` : undefined}
                  >
                    {isCompleted ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label below */}
                  <p
                    onClick={() => handleStepClick(step)}
                    className={`
                      absolute top-9 text-xs text-center w-24 leading-tight transition-all duration-200
                      ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                      ${isCompleted ? 'cursor-pointer hover:text-foreground hover:font-semibold hover:scale-105' : ''}
                    `}
                    title={isCompleted ? `Click to return to ${getStepLabel(step)}` : undefined}
                  >
                    {getStepLabel(step)}
                  </p>
                </div>

                {/* Connecting pipe */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-1.5 relative">
                    {/* Background pipe */}
                    <div className="h-full bg-gray-300 rounded-full" />
                    {/* Progress pipe */}
                    <div
                      className={`
                        absolute top-0 left-0 h-full rounded-full transition-all duration-500
                        ${isCompleted ? 'bg-[var(--primary)] w-full' : 'bg-gray-300 w-0'}
                      `}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion message */}
        {currentStep === ConversationStep.COMPLETE && (
          <div className="mt-8 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-center gap-2">
              <Check size={20} className="text-green-600" />
              <p className="text-sm font-semibold text-green-900">
                Graduation Plan Complete!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
