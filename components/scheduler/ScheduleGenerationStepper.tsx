'use client';

import { Check } from 'lucide-react';

interface ScheduleGenerationStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
}

const STEPS = [
  { number: 1, label: 'Personal Events' },
  { number: 2, label: 'Course Selection' },
  { number: 3, label: 'Preferences' },
  { number: 4, label: 'Preview Results' },
] as const;

export default function ScheduleGenerationStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: Readonly<ScheduleGenerationStepperProps>) {
  const getStepStatus = (step: number): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(step)) {
      return 'completed';
    }
    if (step === currentStep) {
      return 'current';
    }
    return 'upcoming';
  };

  const handleStepClick = (step: number) => {
    const status = getStepStatus(step);
    // Only allow clicking on completed steps
    if (status === 'completed' && onStepClick) {
      onStepClick(step as 1 | 2 | 3 | 4);
    }
  };

  return (
    <div className="w-full py-2 pb-8">
      {/* Mobile: Show current step only */}
      <div className="block lg:hidden">
        <div className="text-center mb-3">
          <p className="text-xs text-muted-foreground mb-1">
            Step {currentStep} of {STEPS.length}
          </p>
          <p className="text-sm font-semibold">{STEPS[currentStep - 1].label}</p>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${(currentStep / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: Progress bar with pipes */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-0">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.number);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center relative">
                  <div
                    onClick={() => handleStepClick(step.number)}
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
                    title={isCompleted ? `Click to return to ${step.label}` : undefined}
                  >
                    {isCompleted ? (
                      <Check size={16} strokeWidth={3} />
                    ) : (
                      <span className="text-xs font-bold">{step.number}</span>
                    )}
                  </div>

                  {/* Step label below */}
                  <p
                    onClick={() => handleStepClick(step.number)}
                    className={`
                      absolute top-9 text-xs text-center w-24 leading-tight transition-all duration-200
                      ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                      ${isCompleted ? 'cursor-pointer hover:text-foreground hover:font-semibold hover:scale-105' : ''}
                    `}
                    title={isCompleted ? `Click to return to ${step.label}` : undefined}
                  >
                    {step.label}
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
      </div>
    </div>
  );
}
