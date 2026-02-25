'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, RefreshCw } from 'lucide-react';
import type { ConversationMetadata } from '@/lib/chatbot/grad-plan/types';
import { getStepLabel } from '@/lib/chatbot/grad-plan/stateManager';

interface ResumeConversationPanelProps {
  items: ConversationMetadata[];
  activeConversationId?: string;
  onResume: (conversationId: string) => void;
  onStartNew?: () => void;
}

export default function ResumeConversationPanel({
  items,
  activeConversationId,
  onResume,
  onStartNew,
}: Readonly<ResumeConversationPanelProps>) {
  const displayItems = items.filter(item => item.conversationId !== activeConversationId);

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl bg-card shadow-sm p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Resume a previous session</h3>
          <p className="text-xs text-muted-foreground">Pick up where you left off or start fresh.</p>
        </div>
        {onStartNew && (
          <Button variant="secondary" size="sm" onClick={onStartNew} className="gap-2">
            <RefreshCw size={14} />
            Start new
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {displayItems.slice(0, 3).map(item => (
          <div key={item.conversationId} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{getStepLabel(item.currentStep)}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.summary || 'Progress saved'} · {new Date(item.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => onResume(item.conversationId)} className="gap-2">
              Resume
              <ArrowRight size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
