'use client';

import { Button } from '@/components/ui/button';

interface ActionFooterProps {
  primaryLabel: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  helperText?: string | null;
  align?: 'between' | 'end';
}

export default function ActionFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
  helperText,
  align = 'between',
}: Readonly<ActionFooterProps>) {
  const justifyClass = align === 'end' ? 'justify-end' : 'justify-between';

  return (
    <div className="rounded-2xl border bg-white/90 p-3 backdrop-blur">
      <div className={`flex flex-wrap items-center gap-3 ${justifyClass}`}>
        {align === 'between' && (
          <p className="text-xs text-muted-foreground">{helperText ?? 'Changes are saved automatically.'}</p>
        )}
        <div className="flex items-center gap-2">
          {secondaryLabel && (
            <Button
              variant="secondary"
              onClick={onSecondary}
              disabled={secondaryDisabled || primaryLoading}
              type="button"
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            type="button"
            aria-busy={primaryLoading}
          >
            {primaryLoading ? 'Working...' : primaryLabel}
          </Button>
        </div>
      </div>
      {align === 'end' && helperText && (
        <p className="mt-2 text-right text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
