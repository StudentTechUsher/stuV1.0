/**
 * Custom styled select component matching Figma aesthetic
 * Used for course selection and other dropdowns in the wizard
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface StyledSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: boolean;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  helperText,
  disabled = false,
  required = false,
  className,
  error = false,
}) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block font-body-semi text-sm text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 rounded-md',
          'font-body text-sm',
          'bg-background border',
          'text-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2',
          // Default state
          'border-border hover:border-primary',
          'focus:border-primary focus:ring-primary-15',
          // Error state
          error && 'border-destructive focus:border-destructive focus:ring-destructive',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed hover:border-border',
          className
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helperText && (
        <p
          className={cn(
            'text-xs font-body',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

export default StyledSelect;
