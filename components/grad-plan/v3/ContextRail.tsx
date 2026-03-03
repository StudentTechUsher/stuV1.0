'use client';

import type { ReactNode } from 'react';
import ContextSectionCard, { type ContextSectionStatus } from '@/components/grad-plan/v3/ContextSectionCard';

export interface ContextRailSection {
  id: string;
  title: string;
  status: ContextSectionStatus;
  summary?: string;
  content?: ReactNode;
  onEdit?: () => void;
}

interface ContextRailProps {
  title?: string;
  subtitle?: string;
  sections: readonly ContextRailSection[];
}

export default function ContextRail({
  title = 'Context Rail',
  subtitle = 'Agent-readable state across the full flow',
  sections,
}: Readonly<ContextRailProps>) {
  return (
    <aside className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 via-white to-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-600">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {sections.map((section) => (
          <ContextSectionCard
            key={section.id}
            title={section.title}
            status={section.status}
            summary={section.summary}
            onEdit={section.onEdit}
          >
            {section.content}
          </ContextSectionCard>
        ))}
      </div>
    </aside>
  );
}
