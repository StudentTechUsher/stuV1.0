'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { SchedulePreferences } from '@/lib/services/scheduleService';

interface PreferencesStepProps {
  preferences: SchedulePreferences;
  onPreferencesChange: (prefs: SchedulePreferences) => void;
  onNext: () => void;
  onBack: () => void;
  hasCourseIssues?: boolean;
  hasValidatedCourses?: boolean;
  isValidatingCourses?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
];

export default function PreferencesStep({
  preferences,
  onPreferencesChange,
  onNext,
  onBack,
  hasCourseIssues = false,
  hasValidatedCourses = false,
  isValidatingCourses = false,
}: PreferencesStepProps) {
  const handleDayToggle = (day: number) => {
    const currentPreferred = preferences.preferred_days || [];
    const newPreferred = currentPreferred.includes(day)
      ? currentPreferred.filter(d => d !== day)
      : [...currentPreferred, day];

    onPreferencesChange({ ...preferences, preferred_days: newPreferred });
  };

  const validateTimes = () => {
    if (preferences.earliest_class_time && preferences.latest_class_time) {
      return preferences.earliest_class_time < preferences.latest_class_time;
    }
    return true;
  };

  const isValid = validateTimes();
  const canReview = isValid && !hasCourseIssues && hasValidatedCourses && !isValidatingCourses;
  const reviewDisabledReason = isValidatingCourses
    ? 'Validating selected courses...'
    : !hasValidatedCourses
      ? 'Complete course validation in Step 3 (Confirm Courses) before reviewing sections.'
      : hasCourseIssues
        ? 'Resolve course issues in Step 3 (Confirm Courses) before reviewing sections.'
        : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Set Your Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your ideal class schedule preferences
        </Typography>
      </Box>

      {/* Time Preferences */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
          Class Timing
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Earliest Start Time"
            type="time"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={preferences.earliest_class_time || '08:00'}
            onChange={(e) => onPreferencesChange({ ...preferences, earliest_class_time: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#06C96C' },
                '&:hover fieldset': { borderColor: '#059669' },
                '&.Mui-focused fieldset': { borderColor: '#06C96C' },
              },
              '& .MuiInputLabel-root': { color: '#047857', '&.Mui-focused': { color: '#059669' } },
            }}
          />
          <TextField
            label="Latest End Time"
            type="time"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={preferences.latest_class_time || '19:00'}
            onChange={(e) => onPreferencesChange({ ...preferences, latest_class_time: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#06C96C' },
                '&:hover fieldset': { borderColor: '#059669' },
                '&.Mui-focused fieldset': { borderColor: '#06C96C' },
              },
              '& .MuiInputLabel-root': { color: '#047857', '&.Mui-focused': { color: '#059669' } },
            }}
          />
        </Box>
        {!isValid && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Earliest start time must be before latest end time
          </Alert>
        )}
      </Box>

      {/* Day Preferences */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          Preferred Days
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Select the days you prefer to have classes.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = (preferences.preferred_days || []).includes(day.value);
            return (
              <Button
                key={day.value}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => handleDayToggle(day.value)}
                sx={{
                  minWidth: 40,
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  p: 0,
                  fontWeight: 600,
                  ...(isSelected ? {
                    bgcolor: '#06C96C',
                    color: 'black',
                    '&:hover': { bgcolor: '#059669' },
                  } : {
                    borderColor: '#06C96C',
                    color: '#047857',
                    '&:hover': { borderColor: '#059669', bgcolor: 'rgba(6, 201, 108, 0.08)' },
                  })
                }}
              >
                {day.label.charAt(0)}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Waitlist Settings */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
          Registration Settings
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.allow_waitlist || false}
              onChange={(e) => onPreferencesChange({ ...preferences, allow_waitlist: e.target.checked })}
              sx={{
                color: '#06C96C',
                '&.Mui-checked': { color: '#06C96C' },
              }}
            />
          }
          label="Allow waitlisted sections if seats are full"
        />
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
          }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={onNext}
          disabled={!canReview}
          sx={{
            bgcolor: '#06C96C',
            color: 'black',
            '&:hover': { bgcolor: '#059669' },
            fontWeight: 600,
          }}
        >
          Review Sections
        </Button>
      </Box>
      {reviewDisabledReason && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {reviewDisabledReason}
        </Alert>
      )}
    </Box>
  );
}
