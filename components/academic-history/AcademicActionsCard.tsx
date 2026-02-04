'use client';

import { ExternalLink, type LucideIcon } from 'lucide-react';

interface AcademicActionsCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export function AcademicActionsCard({
  icon: Icon,
  title,
  description,
  href,
  variant = 'secondary',
}: AcademicActionsCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        variant === 'primary'
          ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:border-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]'
      }`}
      aria-label={`${title} - opens in new tab`}
    >
      {/* External link indicator */}
      <ExternalLink
        size={14}
        className="absolute right-3 top-3 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]"
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
        <Icon size={20} className="text-[var(--primary)]" aria-hidden="true" />
      </div>

      {/* Title */}
      <h4 className="font-body-semi mb-1 pr-6 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h4>

      {/* Description */}
      {description && (
        <p className="font-body text-xs text-[var(--muted-foreground)] line-clamp-2">
          {description}
        </p>
      )}
    </a>
  );
}
