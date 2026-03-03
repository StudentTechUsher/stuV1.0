'use client';

import { AlertTriangle, CheckCircle2, Circle, Filter } from 'lucide-react';
import type { TraceEvent, TraceEventLevel } from '@/lib/chatbot/grad-plan/v3/types';

interface AgentTracePanelProps {
  events: TraceEvent[];
  levelFilter?: TraceEventLevel | 'all';
  onLevelFilterChange?: (value: TraceEventLevel | 'all') => void;
}

const levelOptions: Array<TraceEventLevel | 'all'> = ['all', 'debug', 'info', 'warn', 'error'];

function levelIcon(level: TraceEventLevel) {
  if (level === 'error') return AlertTriangle;
  if (level === 'warn') return AlertTriangle;
  if (level === 'info') return CheckCircle2;
  return Circle;
}

function levelTone(level: TraceEventLevel): string {
  if (level === 'error') return 'text-red-600';
  if (level === 'warn') return 'text-amber-600';
  if (level === 'info') return 'text-emerald-600';
  return 'text-zinc-400';
}

export default function AgentTracePanel({
  events,
  levelFilter = 'all',
  onLevelFilterChange,
}: Readonly<AgentTracePanelProps>) {
  const filtered = levelFilter === 'all'
    ? events
    : events.filter(event => event.level === levelFilter);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Agent Trace</h3>
          <p className="text-xs text-zinc-600">Redacted timeline for phase, skill, and model decisions</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <Filter size={13} />
          <span className="sr-only">Trace level filter</span>
          <select
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
            value={levelFilter}
            onChange={(event) => onLevelFilterChange?.(event.target.value as TraceEventLevel | 'all')}
          >
            {levelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-200 px-3 py-4 text-xs text-zinc-500">
            No trace events yet.
          </p>
        ) : (
          filtered.map((event) => {
            const Icon = levelIcon(event.level);
            const tone = levelTone(event.level);
            return (
              <div key={event.id} className="rounded-lg border border-zinc-100 p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={tone} />
                    <span className="text-xs font-semibold text-zinc-800">{event.message}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(event.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{event.scope}</span>
                  {event.phase && <span className="rounded bg-zinc-100 px-1.5 py-0.5">{event.phase}</span>}
                  {event.redacted && <span className="rounded bg-zinc-100 px-1.5 py-0.5">redacted</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
