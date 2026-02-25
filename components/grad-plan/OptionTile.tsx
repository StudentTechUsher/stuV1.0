'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface OptionTileProps {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * OptionTile - compact, minimal option button for wizard selections
 * Design: Clean border, subtle hover effect, minimal padding
 * Matches Figma's onboarding style with soft shadows and transitions
 */
export default function OptionTile({
  title,
  description,
  selected,
  onClick,
  disabled = false,
  className = '',
}: OptionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full px-4 py-3 md:px-5 md:py-4 rounded-lg border transition-all duration-150
        text-left cursor-pointer group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
        ${
          selected
            ? 'border-[var(--primary)] bg-[rgba(18,249,135,0.1)] dark:bg-[rgba(18,249,135,0.2)]'
            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:border-zinc-500'
        }
        ${className}
      `}
    >
      {/* Checkmark indicator - minimal circle */}
      {selected && (
        <div className="absolute top-3 right-3 md:top-3.5 md:right-3.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
            <Check size={14} className="text-black" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="pr-8">
        <p className="text-base font-medium leading-tight text-foreground">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground md:text-sm">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
