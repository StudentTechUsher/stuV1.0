'use client';

import { useState, useRef, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import { validatePlanName } from '@/lib/utils/plan-name-validation';

interface InlineEditableTitleProps {
  value: string;
  placeholder?: string;
  onSave: (newValue: string) => Promise<{ success: boolean; error?: string }>;
  className?: string;
  disabled?: boolean;
}

export default function InlineEditableTitle({
  value,
  placeholder = 'Untitled',
  onSave,
  className = '',
  disabled = false,
}: InlineEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const validation = validatePlanName(editValue, { allowEmpty: false });
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    const sanitizedValue = validation.sanitizedValue;

    // If value hasn't changed, just exit edit mode
    if (sanitizedValue === value.trim()) {
      setIsEditing(false);
      setEditValue(value);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await onSave(sanitizedValue);
      if (result.success) {
        setIsEditing(false);
        setEditValue(sanitizedValue);
      } else {
        setError(result.error ?? 'Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving title:', error);
      setError('Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Only auto-save on blur if there's no error
    if (!error) {
      handleSave();
    }
  };

  const displayValue = value.trim() || placeholder;
  const isPlaceholder = !value.trim();

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <TextField
          inputRef={inputRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          error={Boolean(error)}
          helperText={error ?? 'Press Enter to save, Esc to cancel'}
          disabled={isSaving}
          fullWidth
          variant="outlined"
          size="small"
          slotProps={{
            htmlInput: { maxLength: 100 }
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '1.5rem',
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              color: '#0a1f1a',
              padding: '4px 8px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(10,31,26,0.3)',
              borderWidth: '2px',
            },
            '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(10,31,26,0.5)',
            },
            '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--primary)',
            },
            '& .MuiFormHelperText-root': {
              marginLeft: 0,
              marginTop: '4px',
              fontSize: '0.75rem',
            },
          }}
        />
      </div>
    );
  }

  return (
    <h1
      onClick={handleClick}
      className={`cursor-text rounded-[4px] px-2 py-1 text-2xl font-semibold tracking-tight transition-all hover:bg-[color-mix(in_srgb,var(--primary)_8%,white)] ${
        isPlaceholder ? 'text-[color-mix(in_srgb,var(--muted-foreground)_60%,black_40%)]' : 'text-[#0a1f1a]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      title={disabled ? '' : 'Click to edit'}
    >
      {displayValue}
    </h1>
  );
}
