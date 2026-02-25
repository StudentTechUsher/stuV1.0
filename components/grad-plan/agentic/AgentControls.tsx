'use client';

import { PauseCircle, PlayCircle, XCircle, CheckCircle2, Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentStatus } from '@/lib/chatbot/grad-plan/types';

interface AgentControlsProps {
  status: AgentStatus;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  awaitingApproval?: boolean;
}

export default function AgentControls({
  status,
  onPause,
  onResume,
  onCancel,
  onApprove,
  onReject,
  awaitingApproval = false,
}: Readonly<AgentControlsProps>) {
  const isPaused = status === 'paused';
  const isRunning = status === 'running';
  const isAwaitingApproval = status === 'awaiting_approval' || awaitingApproval;

  return (
    <div className="border rounded-xl bg-card shadow-sm p-4">
      <h3 className="text-sm font-semibold mb-3">Agent Controls</h3>
      <div className="flex flex-col gap-2">
        {isAwaitingApproval && (
          <div className="flex gap-2">
            <Button variant="primary" onClick={onApprove} className="flex-1 gap-2" disabled={!onApprove}>
              <CheckCircle2 size={16} />
              Approve
            </Button>
            <Button variant="secondary" onClick={onReject} className="flex-1 gap-2" disabled={!onReject}>
              <Slash size={16} />
              Reject
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="secondary" onClick={onPause} className="flex-1 gap-2" disabled={!onPause}>
              <PauseCircle size={16} />
              Pause
            </Button>
          ) : (
            <Button variant="secondary" onClick={onResume} className="flex-1 gap-2" disabled={!onResume}>
              <PlayCircle size={16} />
              Resume
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel} className="flex-1 gap-2" disabled={!onCancel}>
            <XCircle size={16} />
            Cancel
          </Button>
        </div>
        {!isRunning && !isPaused && !isAwaitingApproval && (
          <p className="text-xs text-muted-foreground">
            Controls are inactive while the agent is {status.replace('_', ' ')}.
          </p>
        )}
      </div>
    </div>
  );
}
