'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, Edit } from 'lucide-react';

interface GeneratePlanConfirmationFormProps {
  onSubmit: (data:
    | { action: 'generate'; mode: 'automatic' | 'active_feedback' }
    | { action: 'review' }
  ) => void;
}

export default function GeneratePlanConfirmationForm({
  onSubmit,
}: Readonly<GeneratePlanConfirmationFormProps>) {
  const [selectedMode, setSelectedMode] = useState<'automatic' | 'active_feedback' | null>(null);

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          Choose How to Generate Your Plan
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Pick a generation style for your first draft. You can still make changes later.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="secondary"
          onClick={() => setSelectedMode('automatic')}
          className={`w-full h-auto items-start justify-start gap-3 p-4 shadow-lg text-left ${
            selectedMode === 'automatic' ? 'border border-[var(--primary)] bg-[var(--primary)]/10' : ''
          }`}
        >
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white">
            <Sparkles size={18} />
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Automatic Generation</div>
            <div className="text-xs text-muted-foreground">
              Generate a full plan in one pass based on your inputs.
            </div>
          </div>
        </Button>

        <Button
          variant="secondary"
          onClick={() => setSelectedMode('active_feedback')}
          className={`w-full h-auto items-start justify-start gap-3 p-4 text-left ${
            selectedMode === 'active_feedback' ? 'border border-[var(--primary)] bg-[var(--primary)]/10' : ''
          }`}
        >
          <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-black/5 text-black dark:bg-white/10 dark:text-white">
            <MessageSquare size={18} />
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Active Feedback</div>
            <div className="text-xs text-muted-foreground">
              AI will draft and refine your plan step-by-step with your input.
            </div>
          </div>
        </Button>

        <Button
          variant="primary"
          onClick={() => {
            if (!selectedMode) return;
            onSubmit({ action: 'generate', mode: selectedMode });
          }}
          disabled={!selectedMode}
          className="w-full"
        >
          Confirm Selection
        </Button>

        <Button
          variant="secondary"
          onClick={() => onSubmit({ action: 'review' })}
          className="w-full gap-2 justify-start"
        >
          <Edit size={18} />
          Let me review my information first
        </Button>
      </div>
    </div>
  );
}
