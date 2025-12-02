/**
 * Reusable selectable tile component for wizard steps
 * Supports single and multi-select modes with smooth transitions
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface OptionTileProps {
  icon?: string | React.ReactNode;
  label: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  multiSelect?: boolean;
  className?: string;
}

export const OptionTile: React.FC<OptionTileProps> = ({
  icon,
  label,
  description,
  selected = false,
  onClick,
  disabled = false,
  multiSelect = false,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-start gap-3 p-4 rounded-lg border transition-all duration-200',
        'text-left cursor-pointer group',
        // Default state
        'bg-background border-border hover:border-primary hover:bg-muted',
        // Selected state
        selected && 'bg-primary-15 border-primary border-2',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-background',
        // Multi-select indicator
        multiSelect && selected && 'ring-2 ring-offset-2 ring-primary',
        className
      )}
    >
      {/* Checkbox indicator for multi-select */}
      {multiSelect && (
        <div
          className={cn(
            'absolute top-3 right-3 w-5 h-5 rounded border-2 transition-all duration-200',
            'flex items-center justify-center',
            selected
              ? 'bg-primary border-primary'
              : 'border-border bg-background group-hover:border-primary'
          )}
        >
          {selected && (
            <svg
              className="w-3 h-3 text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      )}

      {/* Icon */}
      {icon && (
        <div className="text-2xl">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}

      {/* Label */}
      <span
        className={cn(
          'font-body-semi text-base transition-colors duration-200',
          selected ? 'text-foreground font-bold' : 'text-foreground'
        )}
      >
        {label}
      </span>

      {/* Description */}
      {description && (
        <p className="text-xs font-body text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </button>
  );
};

export default OptionTile;
