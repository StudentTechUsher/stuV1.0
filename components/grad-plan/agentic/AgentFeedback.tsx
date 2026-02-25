'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentFeedbackProps {
  onFeedback?: (value: 'up' | 'down', reason?: string) => void;
  reasons?: string[];
  compact?: boolean;
}

export default function AgentFeedback({
  onFeedback,
  reasons = [],
  compact = false,
}: Readonly<AgentFeedbackProps>) {
  const [selection, setSelection] = useState<'up' | 'down' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleSelect = (value: 'up' | 'down') => {
    setSelection(value);
    setSelectedReason(null);
    onFeedback?.(value);
  };

  const handleReason = (reason: string) => {
    setSelectedReason(reason);
    if (selection) {
      onFeedback?.(selection, reason);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'pt-2'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Was this decision helpful?</span>
        <Button
          variant={selection === 'up' ? 'primary' : 'secondary'}
          size="sm"
          className="gap-1"
          onClick={() => handleSelect('up')}
        >
          <ThumbsUp size={14} />
          Yes
        </Button>
        <Button
          variant={selection === 'down' ? 'primary' : 'secondary'}
          size="sm"
          className="gap-1"
          onClick={() => handleSelect('down')}
        >
          <ThumbsDown size={14} />
          Not quite
        </Button>
      </div>
      {selection === 'down' && reasons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => handleReason(reason)}
              className={`px-2 py-1 rounded-full text-[10px] border ${
                selectedReason === reason
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-foreground'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
