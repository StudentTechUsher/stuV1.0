/**
 * Assumptions:
 * - Small card for grid/list display
 * - Uses design tokens from globals.css
 * - Shows title + short overview
 */

'use client';

import React from 'react';
import type { Career } from '@/types/career';

interface CareerCardProps {
  career: Career;
  onClick: () => void;
}

export default function CareerCard({ career, onClick }: CareerCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all text-left focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
    >
      <h3 className="text-lg font-body-semi text-[var(--foreground)] mb-2">
        {career.title}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
        {career.shortOverview}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {career.outlook.growthLabel && (
          <span
            className={`px-2 py-1 text-xs font-body-semi rounded-lg ${
              career.outlook.growthLabel === 'Hot'
                ? 'bg-[var(--primary-15)] text-[var(--primary)]'
                : career.outlook.growthLabel === 'Growing'
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
            }`}
          >
            {career.outlook.growthLabel}
          </span>
        )}
        {career.salaryUSD.median && (
          <span className="text-xs text-[var(--muted-foreground)]">
            ${(career.salaryUSD.median / 1000).toFixed(0)}k median
          </span>
        )}
      </div>
    </button>
  );
}
