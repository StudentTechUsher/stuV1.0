/**
 * Micro input field for "Other" option text input
 * Appears below the "Other" tile when selected
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface MicroInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
}

export const MicroInput: React.FC<MicroInputProps> = ({
  value,
  onChange,
  placeholder = 'Tell us more...',
  maxLength = 255,
  className,
  autoFocus = true,
}) => {
  return (
    <div className="mt-3 animate-in fade-in-50 duration-200">
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          'w-full px-3 py-2 rounded-md',
          'font-body text-sm',
          'bg-background border border-border',
          'text-foreground placeholder:text-muted-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-15',
          className
        )}
      />
      {maxLength && (
        <p className="text-xs font-body text-muted-foreground mt-1">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
};

export default MicroInput;
