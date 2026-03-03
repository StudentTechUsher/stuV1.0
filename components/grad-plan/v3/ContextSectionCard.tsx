'use client';

import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Dot, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ContextSectionStatus = 'complete' | 'in_progress' | 'missing';

interface ContextSectionCardProps {
  title: string;
  status: ContextSectionStatus;
  summary?: string;
  children?: ReactNode;
  onEdit?: () => void;
}

const statusMeta: Record<ContextSectionStatus, { icon: typeof Circle; tone: string; label: string }> = {
  complete: {
    icon: CheckCircle2,
    tone: 'text-emerald-600',
    label: 'Complete',
  },
  in_progress: {
    icon: Dot,
    tone: 'text-sky-600',
    label: 'In progress',
  },
  missing: {
    icon: Circle,
    tone: 'text-zinc-400',
    label: 'Missing',
  },
};

export default function ContextSectionCard({
  title,
  status,
  summary,
  children,
  onEdit,
}: Readonly<ContextSectionCardProps>) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={16} className={cn(meta.tone)} />
          <h4 className="truncate text-sm font-semibold text-zinc-900">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            {meta.label}
          </span>
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              type="button"
              onClick={onEdit}
            >
              <Pencil size={12} />
              Edit
            </Button>
          )}
        </div>
      </div>
      {summary && <p className="mt-2 text-xs leading-5 text-zinc-600">{summary}</p>}
      {children && <div className="mt-2 text-xs text-zinc-700">{children}</div>}
    </div>
  );
}

export type { ContextSectionCardProps };
