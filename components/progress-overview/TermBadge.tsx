'use client';

import React from 'react';
import type { CourseStatus } from './types';
import { formatTermLabel, getStatusLabel } from './termUtils';

interface TermBadgeProps {
  /** Course status: completed, in-progress, planned, remaining */
  status: CourseStatus;
  /** Raw term value - will be formatted automatically */
  term?: string;
  /** If true, show only the term (no status prefix) */
  termOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TermBadge - A small pill/badge showing course status and term.
 *
 * Examples:
 * - "Completed • Fall 2024"
 * - "In Progress • Winter 2026"
 * - "Planned • Summer 2027"
 * - "Planned" (when term is missing)
 * - "Fall 2024" (when termOnly is true)
 */
export function TermBadge({
  status,
  term,
  termOnly = false,
  className = '',
}: TermBadgeProps) {
  const formattedTerm = formatTermLabel(term);
  const statusLabel = getStatusLabel(status);

  // Build the display text
  let displayText: string;
  if (termOnly && formattedTerm) {
    displayText = formattedTerm;
  } else if (formattedTerm) {
    displayText = `${statusLabel} • ${formattedTerm}`;
  } else {
    // No term data - show status only or "Term TBD" for planned
    displayText = status === 'planned' || status === 'remaining'
      ? `${statusLabel} • TBD`
      : statusLabel;
  }

  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5
        rounded-full
        text-[10px] font-semibold
        bg-[var(--muted)] text-[var(--muted-foreground)]
        whitespace-nowrap
        ${className}
      `}
    >
      {displayText}
    </span>
  );
}
