'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface CreditsPopoverProps {
  credits: number;
  colorScheme?: 'dark' | 'light';
  gradPlanEditUrl?: string;
}

export default function CreditsPopover({ credits, colorScheme = 'light', gradPlanEditUrl = '/grad-plan' }: CreditsPopoverProps) {
  const [open, setOpen] = useState(false);

  const isDark = colorScheme === 'dark';
  const buttonBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const textColor = isDark ? 'white' : 'inherit';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 hover:opacity-70 transition-opacity font-medium px-3 py-1.5 rounded-md"
          style={{
            color: textColor,
            backgroundColor: buttonBg,
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label="Credits information and options"
        >
          <span className="font-bold text-base">{credits}</span>
          <span className="text-sm">credits</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="text-sm"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-[var(--foreground)]">
            Want to add or remove credits from this semester?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={gradPlanEditUrl}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] bg-[var(--primary)] text-[var(--dark)] hover:opacity-90"
            >
              Edit your grad plan
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]"
            >
              Nevermind, go back
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
