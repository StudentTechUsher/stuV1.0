'use client';

import React from 'react';
import { PenSquare, Save } from 'lucide-react';
import type { Term, Event } from './types';

interface EditModeBannerProps {
  editablePlanData: Term[];
  events: Event[];
  onSave?: (updatedPlan: Term[], events: Event[]) => void;
  role?: 'student' | 'advisor';
}

export function EditModeBanner({ editablePlanData, events, onSave, role = 'student' }: EditModeBannerProps) {
  const instruction = role === 'advisor'
    ? 'Review and adjust the plan. Save when you are ready to notify the student or approve updates.'
    : 'Tweak your plan, then submit for approval once everything looks right.';

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--action-edit)_52%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_12%,white)] px-6 py-4 shadow-[0_34px_120px_-64px_rgba(253,204,74,0.55)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(253,204,74,0.16)] via-transparent to-transparent" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--action-edit)_52%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_16%,transparent)] text-[color-mix(in_srgb,#6b4b05_70%,var(--action-edit)_30%)]">
            <PenSquare size={24} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="max-w-3xl">
            <h2 className="font-header text-lg font-semibold text-[color-mix(in_srgb,#4a3501_65%,var(--action-edit)_35%)]">
              Edit mode active
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[color-mix(in_srgb,#5a4203_70%,var(--action-edit)_30%)]">
              {instruction}
            </p>
          </div>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={() => onSave(editablePlanData, events)}
            className="inline-flex items-center gap-2 rounded-[16px] border border-[color-mix(in_srgb,var(--primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] px-5 py-2 text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary)_22%)] shadow-[0_28px_68px_-48px_rgba(18,249,135,0.6)] transition-all duration-150 hover:-translate-y-[2px] hover:bg-[color-mix(in_srgb,var(--primary)_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            <Save size={18} strokeWidth={2.25} aria-hidden="true" />
            Save plan
          </button>
        )}
      </div>
    </section>
  );
}
