'use client';

import { CheckCircle2, Circle, Dot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';
import { getStepLabel } from '@/lib/chatbot/grad-plan/stateManager';

interface StepNavigatorPanelProps {
  currentStep: ConversationStep;
  completedSteps: ConversationStep[];
  onStepClick?: (step: ConversationStep) => void;
}

const STEP_ORDER: ConversationStep[] = [
  ConversationStep.PROFILE_CHECK,
  ConversationStep.PROGRAM_SELECTION,
  ConversationStep.COURSE_SELECTION,
  ConversationStep.CREDIT_DISTRIBUTION,
  ConversationStep.MILESTONES_AND_CONSTRAINTS,
  ConversationStep.GENERATING_PLAN,
];

export default function StepNavigatorPanel({
  currentStep,
  completedSteps,
  onStepClick,
}: Readonly<StepNavigatorPanelProps>) {
  return (
    <div className="border rounded-xl bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Step Navigator</h3>
        <span className="text-xs text-muted-foreground">
          {completedSteps.length}/{STEP_ORDER.length} complete
        </span>
      </div>
      <div className="space-y-2">
        {STEP_ORDER.map((step) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const Icon = isCompleted ? CheckCircle2 : isCurrent ? Dot : Circle;

          return (
            <div key={step} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  size={16}
                  className={isCompleted ? 'text-emerald-600' : isCurrent ? 'text-[var(--primary)]' : 'text-muted-foreground'}
                />
                <span className={`text-xs ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'} truncate`}>
                  {getStepLabel(step)}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                    Current
                  </span>
                )}
              </div>
              {isCompleted && onStepClick && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStepClick(step)}
                  className="h-7 px-2 text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
