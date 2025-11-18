'use client';

import { Check } from 'lucide-react';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import { getStepLabel } from '@/lib/chatbot/grad-plan/stateManager';

interface ConversationProgressStepsProps {
  currentStep: ConversationStep;
  completedSteps: ConversationStep[];
}

// Main visible steps for the progress indicator (simplified for UI)
const MAIN_STEPS: ConversationStep[] = [
  ConversationStep.PROFILE_SETUP,
  ConversationStep.TRANSCRIPT_CHECK,
  ConversationStep.STUDENT_TYPE,
  ConversationStep.PROGRAM_SELECTION,
  ConversationStep.COURSE_METHOD,
  ConversationStep.ADDITIONAL_CONCERNS,
  ConversationStep.GENERATING_PLAN,
];

export default function ConversationProgressSteps({
  currentStep,
  completedSteps,
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

  const currentStepIndex = MAIN_STEPS.indexOf(currentStep);

  return (
    <div className="w-full py-4 pb-12">
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
            const isUpcoming = status === 'upcoming';
            const isLast = index === MAIN_STEPS.length - 1;

            return (
              <div key={step} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center relative">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      border-3 transition-all duration-300
                      ${
                        isCompleted
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-black shadow-md'
                          : isCurrent
                          ? 'bg-white border-[var(--primary)] text-[var(--primary)] shadow-sm border-[2px]'
                          : 'bg-white border-gray-300 text-gray-400 border-[1.5px]'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label below */}
                  <p
                    className={`
                      absolute top-10 text-xs text-center w-24 leading-tight
                      ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                    `}
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
