'use client';

import React from 'react';

interface PlanAssumptionsProps {
  assumptions: string[];
}

export function PlanAssumptions({ assumptions }: PlanAssumptionsProps) {
  if (!assumptions || assumptions.length === 0) return null;

  return (
    <section className="mt-6 rounded-[24px] border border-[color-mix(in_srgb,var(--primary)_42%,transparent)] bg-white px-5 py-4 shadow-[0_32px_90px_-60px_rgba(18,249,135,0.25)]">
      <h3 className="font-header text-lg font-semibold text-[#0a1f1a]">
        Plan assumptions
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_78%,var(--primary)_22%)]">
        {assumptions.map((assumption) => (
          <li key={assumption} className="rounded-[14px] border border-transparent bg-white/40 px-3 py-2 backdrop-blur-sm">
            {assumption}
          </li>
        ))}
      </ul>
    </section>
  );
}
