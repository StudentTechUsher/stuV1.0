'use client';

import { CheckCircle2, Circle, LoaderCircle, PlugZap, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { V3GenerationPhase } from '@/lib/chatbot/grad-plan/v3/types';

export interface GenerationProgressMilestone {
  phase: V3GenerationPhase;
  label: string;
  percent: number;
}

interface GenerationProgressCardProps {
  phase: V3GenerationPhase | null;
  percent: number;
  message?: string | null;
  connected?: boolean;
  milestones?: GenerationProgressMilestone[];
}

const defaultMilestones: GenerationProgressMilestone[] = [
  { phase: 'queued', label: 'Queued', percent: 0 },
  { phase: 'preparing', label: 'Preparing', percent: 5 },
  { phase: 'major_skeleton', label: 'Skeleton', percent: 15 },
  { phase: 'major_fill', label: 'Major', percent: 35 },
  { phase: 'minor_fill', label: 'Minor', percent: 50 },
  { phase: 'gen_ed_fill', label: 'Gen Ed', percent: 65 },
  { phase: 'elective_fill', label: 'Electives', percent: 80 },
  { phase: 'verify_heuristics', label: 'Verify', percent: 92 },
  { phase: 'persisting', label: 'Persist', percent: 97 },
  { phase: 'completed', label: 'Complete', percent: 100 },
];

const phaseLabel: Record<V3GenerationPhase, string> = {
  queued: 'Queued',
  preparing: 'Preparing input',
  major_skeleton: 'Building skeleton',
  major_fill: 'Filling major requirements',
  minor_fill: 'Filling minor requirements',
  gen_ed_fill: 'Filling general education',
  elective_fill: 'Adding electives',
  verify_heuristics: 'Verifying heuristics',
  persisting: 'Saving plan',
  completed: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
};

export default function GenerationProgressCard({
  phase,
  percent,
  message,
  connected = true,
  milestones = defaultMilestones,
}: Readonly<GenerationProgressCardProps>) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const resolvedPhase = phase ?? 'queued';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Generation Progress</p>
          <p className="text-xs text-zinc-600">{message ?? phaseLabel[resolvedPhase]}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {connected ? (
            <>
              <PlugZap size={14} className="text-emerald-600" />
              Live
            </>
          ) : (
            <>
              <Unplug size={14} className="text-amber-600" />
              Reconnecting
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-500"
            style={{ width: `${safePercent}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safePercent}
            aria-label="Generation progress"
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
          <span>{phaseLabel[resolvedPhase]}</span>
          <span>{safePercent}%</span>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {milestones.map((milestone) => {
          const done = safePercent >= milestone.percent;
          const active = resolvedPhase === milestone.phase;
          return (
            <li key={milestone.phase} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : active ? (
                  <LoaderCircle size={14} className="animate-spin text-sky-600" />
                ) : (
                  <Circle size={14} className="text-zinc-300" />
                )}
                <span className={cn(done || active ? 'text-zinc-900' : 'text-zinc-500')}>
                  {milestone.label}
                </span>
              </div>
              <span className="text-zinc-500">{milestone.percent}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { defaultMilestones as generationProgressMilestones };
