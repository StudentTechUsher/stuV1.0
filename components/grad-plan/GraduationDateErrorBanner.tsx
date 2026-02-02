'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertTitle,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { InvalidGraduationDateError } from '@/lib/services/gradPlanGenerationService';
import { updateGraduationTimelineAction } from '@/lib/services/server-actions';

interface GraduationDateErrorBannerProps {
  error: InvalidGraduationDateError;
  studentData: {
    admission_year: number;
    admission_term: string;
    est_grad_date: string;
  };
  onDateUpdated: () => void;
}

const TERMS = ['Fall', 'Winter', 'Spring', 'Summer'];

export function GraduationDateErrorBanner({
  error,
  studentData,
  onDateUpdated,
}: GraduationDateErrorBannerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Parse current graduation date
  const currentGradDate = new Date(studentData.est_grad_date);
  const currentGradYear = currentGradDate.getFullYear();
  const currentGradMonth = currentGradDate.getMonth();

  // Determine current term based on month
  const getCurrentTerm = () => {
    if (currentGradMonth >= 8) return 'Fall';
    if (currentGradMonth >= 5) return 'Summer';
    if (currentGradMonth >= 4) return 'Spring';
    return 'Winter';
  };

  const [selectedTerm, setSelectedTerm] = useState(getCurrentTerm());
  const [selectedYear, setSelectedYear] = useState(currentGradYear);

  // Determine error message and action based on error code
  const getErrorContent = () => {
    switch (error.code) {
      case 'ADMISSION_YEAR_INVALID':
        return {
          title: 'Invalid Admission Year',
          message: `Your admission year (${studentData.admission_year}) is outside the valid range. Please update your profile settings.`,
          showEdit: false,
          showProfileLink: true,
        };

      case 'INVALID_TERM_IDS':
        return {
          title: 'Institution Configuration Issue',
          message:
            'There is a problem with your institution\'s academic term configuration. Please contact support for assistance.',
          showEdit: false,
          showProfileLink: false,
        };

      case 'GRADUATION_BEFORE_ADMISSION':
        return {
          title: 'Graduation Date Before Admission',
          message: `Your graduation date (${currentGradDate.toLocaleDateString()}) is before your admission date (${studentData.admission_term} ${studentData.admission_year}). Please update your graduation date.`,
          showEdit: true,
          showProfileLink: false,
        };

      case 'INVALID_DATE_FORMAT':
        return {
          title: 'Invalid Graduation Date',
          message: 'Your graduation date is not in a valid format. Please update it.',
          showEdit: true,
          showProfileLink: false,
        };

      default:
        return {
          title: 'Graduation Date Error',
          message: error.message,
          showEdit: false,
          showProfileLink: false,
        };
    }
  };

  const content = getErrorContent();

  const handleSave = async () => {
    // Client-side validation
    if (selectedYear < studentData.admission_year) {
      setSaveError(
        `Graduation year cannot be before admission year (${studentData.admission_year})`
      );
      return;
    }

    // If same year, validate term ordering
    if (selectedYear === studentData.admission_year) {
      const termOrder = ['Winter', 'Spring', 'Summer', 'Fall'];
      const admissionTermIndex = termOrder.indexOf(studentData.admission_term);
      const selectedTermIndex = termOrder.indexOf(selectedTerm);

      if (selectedTermIndex < admissionTermIndex) {
        setSaveError(
          `Graduation term cannot be before admission term (${studentData.admission_term} ${studentData.admission_year})`
        );
        return;
      }
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      // Convert term/year to date (use end of term month)
      const termMonths: Record<string, number> = {
        Winter: 0, // January
        Spring: 4, // May
        Summer: 5, // June
        Fall: 11, // December
      };

      const month = termMonths[selectedTerm];
      const day = new Date(selectedYear, month + 1, 0).getDate(); // Last day of month
      const newGradDate = new Date(selectedYear, month, day);

      const result = await updateGraduationTimelineAction({
        est_grad_term: selectedTerm,
        est_grad_date: newGradDate.toISOString(),
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to update graduation date');
        return;
      }

      // Success - notify parent
      setIsEditing(false);
      onDateUpdated();
    } catch (err) {
      console.error('Failed to update graduation date:', err);
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Alert severity="error" sx={{ mb: 3 }}>
      <AlertTitle>{content.title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {content.message}
      </Typography>

      {/* Current Timeline Display */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
        <Typography variant="caption" display="block" gutterBottom>
          <strong>Current Timeline:</strong>
        </Typography>
        <Typography variant="body2">
          Admission: {studentData.admission_term} {studentData.admission_year}
        </Typography>
        <Typography variant="body2">
          Graduation: {currentGradDate.toLocaleDateString()}
        </Typography>
      </Box>

      {/* Action Buttons */}
      {content.showProfileLink && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push('/settings/profile')}
        >
          Go to Profile Settings
        </Button>
      )}

      {content.showEdit && !isEditing && (
        <Button variant="contained" color="primary" onClick={() => setIsEditing(true)}>
          Fix Now
        </Button>
      )}

      {/* Inline Editor */}
      {content.showEdit && isEditing && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Update Graduation Date
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              label="Graduation Term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={isSaving}
            >
              {TERMS.map((term) => (
                <MenuItem key={term} value={term}>
                  {term}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              fullWidth
              label="Graduation Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              disabled={isSaving}
              inputProps={{
                min: studentData.admission_year,
                max: new Date().getFullYear() + 10,
              }}
            />
          </Stack>

          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setIsEditing(false);
                setSaveError(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Alert>
  );
}
