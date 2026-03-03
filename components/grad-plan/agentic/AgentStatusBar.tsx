'use client';

import { Activity, AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import type { AgentStatus } from '@/lib/chatbot/grad-plan/types';

interface AgentStatusBarProps {
  status: AgentStatus;
  currentStepLabel?: string;
  summary?: string;
  lastUpdated?: string;
}

const statusConfig: Record<AgentStatus, { label: string; tone: string; icon: typeof Activity }> = {
  idle: { label: 'Idle', tone: 'bg-muted text-muted-foreground', icon: Activity },
  running: { label: 'Running', tone: 'bg-emerald-100 text-emerald-700', icon: PlayCircle },
  paused: { label: 'Paused', tone: 'bg-amber-100 text-amber-700', icon: PauseCircle },
  awaiting_approval: { label: 'Awaiting approval', tone: 'bg-orange-100 text-orange-700', icon: ShieldCheck },
  complete: { label: 'Complete', tone: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  error: { label: 'Needs attention', tone: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function AgentStatusBar({
  status,
  currentStepLabel,
  summary,
  lastUpdated,
}: Readonly<AgentStatusBarProps>) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : 'Just now';

  return (
    <div className="w-full border-b bg-card">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.tone}`}>
            <Icon size={14} />
            {config.label}
          </span>
          {currentStepLabel && (
            <span className="text-sm font-medium text-foreground">
              {currentStepLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {summary && <span>{summary}</span>}
          <span>Last update: {updatedLabel}</span>
        </div>
      </div>
    </div>
  );
}
