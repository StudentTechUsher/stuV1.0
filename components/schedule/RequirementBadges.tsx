'use client';

import React from 'react';
import { RequirementTag } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface RequirementBadge {
  type: RequirementTag;
  weight?: number;
}

interface RequirementBadgesProps {
  tags: RequirementBadge[];
  className?: string;
}

const requirementConfig: Record<RequirementTag, { label: string; colorClass: string }> = {
  MAJOR: {
    label: 'MAJOR',
    colorClass: 'bg-[var(--major)] text-white',
  },
  MINOR: {
    label: 'MINOR',
    colorClass: 'bg-[var(--minor)] text-white',
  },
  GE: {
    label: 'GE',
    colorClass: 'bg-[var(--ge)] text-white',
  },
  REL: {
    label: 'REL',
    colorClass: 'bg-[var(--rel)] text-white',
  },
  ELECTIVE: {
    label: 'ELECTIVE',
    colorClass: 'bg-[var(--elective)] text-white',
  },
};

export function RequirementBadges({ tags, className }: RequirementBadgesProps) {
  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag, index) => {
        const config = requirementConfig[tag.type] || {
          label: tag.type,
          colorClass: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
        };

        const displayText = tag.weight != null
          ? `${config.label} ${tag.weight.toFixed(1)}`
          : config.label;

        return (
          <span
            key={`${tag.type}-${index}`}
            className={cn(
              'inline-flex items-center justify-center',
              'px-2.5 py-1 rounded-full',
              'text-[10px] font-semibold uppercase tracking-wide',
              'shadow-inner',
              config.colorClass
            )}
            aria-label={`Fulfills ${config.label} requirement${tag.weight ? ` ${tag.weight.toFixed(1)}` : ''}`}
          >
            {displayText}
          </span>
        );
      })}
    </div>
  );
}
