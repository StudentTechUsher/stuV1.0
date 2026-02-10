'use client';

import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { AgentLogItem } from '@/lib/chatbot/grad-plan/types';

interface AgentActivityPanelProps {
  items: AgentLogItem[];
}

const statusIconMap = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: AlertTriangle,
  default: Circle,
};

const statusToneMap: Record<string, string> = {
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  fail: 'text-red-600',
  default: 'text-muted-foreground',
};

export default function AgentActivityPanel({ items }: Readonly<AgentActivityPanelProps>) {
  return (
    <div className="border rounded-xl bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Agent Activity</h3>
        <span className="text-xs text-muted-foreground">{items.length} events</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent activity yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = statusIconMap[item.status ?? 'default'];
            const tone = statusToneMap[item.status ?? 'default'];
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Icon size={16} className={tone} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
