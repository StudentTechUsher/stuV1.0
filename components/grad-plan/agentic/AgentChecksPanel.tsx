'use client';

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { AgentCheck } from '@/lib/chatbot/grad-plan/types';

interface AgentChecksPanelProps {
  checks: AgentCheck[];
}

const statusMap = {
  ok: { icon: CheckCircle2, tone: 'text-emerald-600' },
  warn: { icon: AlertTriangle, tone: 'text-amber-600' },
  fail: { icon: XCircle, tone: 'text-red-600' },
};

export default function AgentChecksPanel({ checks }: Readonly<AgentChecksPanelProps>) {
  return (
    <div className="border rounded-xl bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Evidence & Checks</h3>
        <span className="text-xs text-muted-foreground">{checks.length} checks</span>
      </div>
      {checks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No checks recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {checks.map((check) => {
            const Icon = statusMap[check.status].icon;
            const tone = statusMap[check.status].tone;
            return (
              <div key={check.id} className="flex items-start gap-3">
                <Icon size={16} className={tone} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{check.label}</p>
                  {check.evidence && check.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {check.evidence.map((item) => (
                        <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
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
