'use client';

import { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { Option } from '@/types/option';

interface SearchableMultiSelectProps {
  label: string;
  helper?: string;
  options: Option[];
  values: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  allowCustomEntries?: boolean;
  onAddCustomEntry?: (name: string) => Promise<{ id: number; name: string } | null>;
  placeholder?: string;
  maxSelections?: number;
}

export default function SearchableMultiSelect({
  label,
  helper,
  options,
  values,
  onChange,
  disabled = false,
  allowCustomEntries = false,
  onAddCustomEntry,
  placeholder = 'Search or type to add...',
  maxSelections,
}: Readonly<SearchableMultiSelectProps>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localOptions, setLocalOptions] = useState<Option[]>(options);

  // Sync localOptions when the options prop changes
  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  // Get selected options from values
  const selectedOptions = localOptions.filter((opt) => values.includes(opt.id));

  const handleChange = async (
    _event: React.SyntheticEvent,
    newValue: (Option | string)[]
  ) => {
    if (disabled) return;

    // Check max selections
    if (maxSelections && newValue.length > maxSelections) {
      setError(`You can select up to ${maxSelections} items`);
      return;
    }

    setError(null);

    // Handle custom entries (strings that don't exist in options)
    const customEntries = newValue.filter((item) => typeof item === 'string') as string[];
    const existingSelections = newValue.filter(
      (item) => typeof item !== 'string'
    ) as Option[];

    // Process custom entries
    if (customEntries.length > 0 && allowCustomEntries && onAddCustomEntry) {
      setLoading(true);

      for (const entryText of customEntries) {
        try {
          const result = await onAddCustomEntry(entryText);
          if (result) {
            // Add to local options if not already there
            if (!localOptions.find((opt) => opt.id === result.id)) {
              setLocalOptions((prev) => [...prev, result]);
            }
            // Add to selections
            existingSelections.push(result);
          }
        } catch (error) {
          console.error('Error adding custom entry:', error);
          setError('Failed to add custom entry. Please try again.');
        }
      }

      setLoading(false);
    }

    // Update values
    const newIds = existingSelections.map((opt) => opt.id);
    onChange(newIds);
  };

  const handleClear = () => {
    if (!disabled) {
      onChange([]);
      setError(null);
    }
  };

  return (
    <Box sx={{ marginBottom: 2, opacity: disabled ? 0.6 : 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Typography variant="subtitle1" className="font-header font-semibold">
          {label}
        </Typography>
        {values.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground underline bg-transparent border-none cursor-pointer"
            aria-label={`Clear ${label} selections`}
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </Box>

      {helper && (
        <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
          {helper}
        </Typography>
      )}

      {error && (
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            backgroundColor: '#fee',
            border: '1px solid #fca5a5',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: '#b91c1c' }}>
            {error}
          </Typography>
        </Box>
      )}

      <Autocomplete
        multiple
        freeSolo={allowCustomEntries}
        options={localOptions}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return option.name;
        }}
        value={selectedOptions}
        onChange={handleChange}
        loading={loading}
        disabled={disabled || loading}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedOptions.length === 0 ? placeholder : ''}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={typeof option === 'string' ? option : option.name}
                {...tagProps}
                sx={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      color: 'white',
                    },
                  },
                }}
              />
            );
          })
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />

      {maxSelections && (
        <Typography
          variant="caption"
          sx={{ color: '#666', mt: 0.5, display: 'block' }}
        >
          {values.length}/{maxSelections} selected
        </Typography>
      )}

      {allowCustomEntries && (
        <Typography
          variant="caption"
          sx={{ color: '#666', mt: 0.5, display: 'block', fontStyle: 'italic' }}
        >
          Type and press Enter to add custom entries
        </Typography>
      )}
    </Box>
  );
}
