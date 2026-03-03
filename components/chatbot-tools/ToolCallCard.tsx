'use client';

import type { ReactNode } from 'react';

type ToolCallStatus = 'queued' | 'active' | 'complete' | 'error';

interface ToolCallCardProps {
  label: string;
  status: ToolCallStatus;
  summary?: string;
  children?: ReactNode;
}

const statusStyles: Record<ToolCallStatus, string> = {
  queued: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  complete: 'bg-green-100 text-green-700',
  error: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<ToolCallStatus, string> = {
  queued: 'Queued',
  active: 'Active',
  complete: 'Complete',
  error: 'Needs attention',
};

export default function ToolCallCard({ label, status, summary, children }: ToolCallCardProps) {
  return (
    <div className="border rounded-xl bg-card text-card-foreground border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="font-semibold text-sm text-foreground">{label}</div>
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[status]}`}>
          {statusLabels[status]}
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
        {children}
      </div>
    </div>
  );
}
