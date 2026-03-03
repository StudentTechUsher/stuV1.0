'use client';

import { BrainCircuit, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationMode } from '@/lib/chatbot/grad-plan/v3/types';

interface GenerationModeCardProps {
  value: GenerationMode | null;
  onChange?: (value: GenerationMode) => void;
  disabled?: boolean;
  activeFeedbackEnabled?: boolean;
}

const options: Array<{
  value: GenerationMode;
  title: string;
  description: string;
  icon: typeof BrainCircuit;
}> = [
  {
    value: 'automatic',
    title: 'Automatic Generation',
    description: 'Runs the full 7a-7f planning pipeline and returns a complete draft plan.',
    icon: BrainCircuit,
  },
  {
    value: 'active_feedback',
    title: 'Active Feedback',
    description: 'Generates in phases and pauses for your review before major adjustments.',
    icon: MessageSquareText,
  },
];

export default function GenerationModeCard({
  value,
  onChange,
  disabled,
  activeFeedbackEnabled = false,
}: Readonly<GenerationModeCardProps>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        const optionDisabled = disabled || (option.value === 'active_feedback' && !activeFeedbackEnabled);
        const disabledDescription = option.value === 'active_feedback' && !activeFeedbackEnabled
          ? 'Active feedback is coming soon for v3.'
          : option.description;

        return (
          <button
            key={option.value}
            type="button"
            disabled={optionDisabled}
            onClick={() => onChange?.(option.value)}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
              optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-emerald-300 hover:shadow-sm',
              isSelected
                ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                : 'border-zinc-200 bg-white'
            )}
            aria-pressed={isSelected}
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className={isSelected ? 'text-emerald-700' : 'text-zinc-500'} />
              <p className="text-sm font-semibold text-zinc-900">{option.title}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">{disabledDescription}</p>
          </button>
        );
      })}
    </div>
  );
}
