/**
 * Assumptions:
 * - Simple label/value row for info sections
 * - Uses design tokens
 */

'use client';

import React from 'react';

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

export default function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
      <dt className="font-body-semi text-[var(--foreground)] min-w-[140px]">
        {label}:
      </dt>
      <dd className="text-[var(--muted-foreground)] font-body flex-1">{value}</dd>
    </div>
  );
}
