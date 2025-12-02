/**
 * Section header component for wizard step titles and subtitles
 * Provides consistent formatting across all steps
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtext?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtext,
  className,
}) => {
  return (
    <div className={cn('mb-6 space-y-2', className)}>
      <h1 className="text-3xl font-header-bold text-foreground">
        {title}
      </h1>
      {subtext && (
        <p className="text-sm font-body text-muted-foreground">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
