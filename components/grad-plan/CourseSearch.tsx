'use client';

import { useState, useEffect, useCallback } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { searchCourseOfferings, type CourseOffering } from '@/lib/services/courseOfferingService';

interface CourseSearchProps {
  universityId: number;
  onSelect: (course: CourseOffering) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  autoFocus?: boolean;
}

export default function CourseSearch({
  universityId,
  onSelect,
  placeholder = 'Search for a course by code or name...',
  disabled = false,
  label,
  size = 'small',
  fullWidth = true,
  autoFocus = false,
}: Readonly<CourseSearchProps>) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Don't search if input is too short
    if (inputValue.trim().length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    // Set loading state immediately
    setLoading(true);
    setError(null);

    // Debounce delay
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchCourseOfferings(universityId, inputValue.trim());
        // Limit results to top 50 for performance
        setOptions(results.slice(0, 50));
      } catch (err) {
        console.error('Error searching courses:', err);
        setError('Failed to search courses. Please try again.');
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250); // 250ms debounce

    // Cleanup function to cancel pending searches
    return () => {
      clearTimeout(timeoutId);
    };
  }, [inputValue, universityId]);

  const handleCourseSelect = useCallback(
    (_event: React.SyntheticEvent, value: CourseOffering | null) => {
      if (value) {
        onSelect(value);
        // Clear input after selection
        setInputValue('');
        setOptions([]);
      }
    },
    [onSelect]
  );

  return (
    <Autocomplete
      fullWidth={fullWidth}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={(option) => {
        const credits = option.credits_decimal ? `${option.credits_decimal} cr` : '3.0 cr';
        return `${option.course_code} — ${option.title} (${credits})`;
      }}
      filterOptions={(x) => x} // Disable client-side filtering (server does it)
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={handleCourseSelect}
      isOptionEqualToValue={(option, value) => option.offering_id === value.offering_id}
      noOptionsText={
        inputValue.trim().length < 2
          ? 'Type at least 2 characters to search'
          : error
          ? error
          : 'No courses found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          autoFocus={autoFocus}
          error={!!error}
          helperText={error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: 'var(--primary)',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'var(--primary)',
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };

        // Build tooltip content with full details
        const tooltipContent = (
          <Box sx={{ maxWidth: 400 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#ffffff' }}>
              {option.course_code} — {option.title}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#e0e0e0' }}>
              <strong>Credits:</strong> {option.credits_decimal || 3.0}
            </Typography>
            {option.prerequisites && (
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#e0e0e0' }}>
                <strong>Prerequisites:</strong> {option.prerequisites}
              </Typography>
            )}
            {option.description && (
              <Typography variant="caption" sx={{ display: 'block', color: '#e0e0e0' }}>
                <strong>Description:</strong> {option.description}
              </Typography>
            )}
            {!option.description && !option.prerequisites && (
              <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#b0b0b0' }}>
                No additional details available
              </Typography>
            )}
          </Box>
        );

        return (
          <Tooltip
            key={key}
            title={tooltipContent}
            placement="left-start"
            arrow
            enterDelay={300}
            enterNextDelay={300}
            PopperProps={{
              modifiers: [
                {
                  name: 'flip',
                  enabled: true,
                  options: {
                    fallbackPlacements: ['left', 'top-start', 'bottom-start', 'right-start'],
                  },
                },
                {
                  name: 'preventOverflow',
                  enabled: true,
                  options: {
                    boundary: 'viewport',
                    padding: 8,
                  },
                },
              ],
            }}
            slotProps={{
              tooltip: {
                sx: {
                  backgroundColor: '#1a1a1a',
                  border: '1px solid var(--primary)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  maxWidth: 450,
                  padding: '12px',
                  fontSize: '0.75rem',
                  zIndex: 9999,
                },
              },
              arrow: {
                sx: {
                  color: '#1a1a1a',
                  '&::before': {
                    border: '1px solid var(--primary)',
                  },
                },
              },
            }}
          >
            <Box
              component="li"
              {...otherProps}
              sx={{
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'var(--primary-15)',
                  transform: 'translateX(4px)',
                },
                '&[aria-selected="true"]': {
                  backgroundColor: 'var(--primary-22)',
                },
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: 'var(--foreground)',
                  }}
                >
                  {option.course_code}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--muted-foreground)',
                    display: 'block',
                  }}
                >
                  {option.title} ({option.credits_decimal || 3.0} credits)
                </Typography>
                {option.description && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'var(--muted-foreground)',
                      display: 'block',
                      fontSize: '0.7rem',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {option.description.substring(0, 100)}
                    {option.description.length > 100 ? '...' : ''}
                  </Typography>
                )}
              </Box>
            </Box>
          </Tooltip>
        );
      }}
      sx={{
        '& .MuiAutocomplete-popper': {
          '& .MuiPaper-root': {
            borderRadius: '7px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        },
      }}
    />
  );
}
