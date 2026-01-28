/**
 * Profile Settings Modal Component
 *
 * Modal dialog for editing academic planning settings within grad plan creation flow
 * Allows users to update their profile without leaving the workflow
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import { UserX, Clock, Briefcase, Calendar } from 'lucide-react';

interface StudentPlanningData {
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  is_transfer: boolean | null;
  student_type: 'undergraduate' | 'graduate' | null;
  work_status: 'not_working' | 'part_time' | 'full_time' | 'variable' | null;
  career_goals: string | null;
}

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  currentStudentData: StudentPlanningData | null;
  onUpdateGraduationTimeline: (data: {
    est_grad_date?: string | null;
    est_grad_term?: string | null;
    admission_year?: number | null;
  }) => Promise<void>;
  onUpdateStudentType: (studentType: 'undergraduate' | 'graduate') => Promise<void>;
  onUpdateWorkStatus: (workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable') => Promise<void>;
  onUpdateCareerGoals: (careerGoals: string | null) => Promise<void>;
}

const GRAD_TERMS = ['Fall', 'Winter', 'Spring', 'Summer'];

const WORK_STATUS_OPTIONS = [
  { value: 'not_working', label: 'Not Working', icon: UserX },
  { value: 'part_time', label: 'Part-time', icon: Clock },
  { value: 'full_time', label: 'Full-time', icon: Briefcase },
  { value: 'variable', label: 'Variable', icon: Calendar },
];

export function ProfileSettingsModal({
  open,
  onClose,
  onSave,
  currentStudentData,
  onUpdateGraduationTimeline,
  onUpdateStudentType,
  onUpdateWorkStatus,
  onUpdateCareerGoals,
}: ProfileSettingsModalProps) {
  // Form state
  const [gradTerm, setGradTerm] = useState<string>('');
  const [gradYear, setGradYear] = useState<string>('');
  const [admissionYear, setAdmissionYear] = useState<string>('');
  const [studentType, setStudentType] = useState<'undergraduate' | 'graduate' | ''>('');
  const [workStatus, setWorkStatus] = useState<'not_working' | 'part_time' | 'full_time' | 'variable' | ''>('');
  const [careerGoals, setCareerGoals] = useState<string>('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && currentStudentData) {
      setGradTerm(currentStudentData.est_grad_term || '');
      if (currentStudentData.est_grad_date) {
        const year = new Date(currentStudentData.est_grad_date).getFullYear();
        setGradYear(year.toString());
      } else {
        setGradYear('');
      }
      setAdmissionYear(currentStudentData.admission_year?.toString() || '');
      setStudentType(currentStudentData.student_type || '');
      setWorkStatus(currentStudentData.work_status || '');
      setCareerGoals(currentStudentData.career_goals || '');
      setError(null);
    }
  }, [open, currentStudentData]);

  const handleSaveAndContinue = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate required fields
      if (!gradTerm || !gradYear || !admissionYear || !studentType) {
        setError('Please fill in all required fields');
        return;
      }

      // Update graduation timeline
      await onUpdateGraduationTimeline({
        est_grad_term: gradTerm,
        est_grad_date: `${gradYear}-01-01`,
        admission_year: parseInt(admissionYear),
      });

      // Update student type
      await onUpdateStudentType(studentType);

      // Update work status if set
      if (workStatus) {
        await onUpdateWorkStatus(workStatus);
      }

      // Update career goals
      await onUpdateCareerGoals(careerGoals || null);

      // Call parent save callback and close
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save profile settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const canSave = gradTerm && gradYear && admissionYear && studentType;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Student Profile
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Update your profile to continue creating your graduation plan
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Graduation Timeline */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Graduation Timeline <span style={{ color: '#DC2626' }}>*</span>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Graduation Term</InputLabel>
                <Select
                  value={gradTerm}
                  onChange={(e) => setGradTerm(e.target.value)}
                  label="Graduation Term"
                >
                  {GRAD_TERMS.map(term => (
                    <MenuItem key={term} value={term}>
                      {term}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Graduation Year"
                type="number"
                required
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                inputProps={{ min: currentYear, max: currentYear + 10 }}
              />

              <TextField
                label="Admission Year"
                type="number"
                required
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
                inputProps={{ min: 1950, max: currentYear }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Student Type */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1.5, fontWeight: 600 }}>
              Student Type <span style={{ color: '#DC2626' }}>*</span>
            </FormLabel>
            <RadioGroup
              value={studentType}
              onChange={(e) => setStudentType(e.target.value as 'undergraduate' | 'graduate')}
            >
              <FormControlLabel
                value="undergraduate"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Undergraduate
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Pursuing a bachelor&apos;s degree
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="graduate"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Graduate
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Pursuing a master&apos;s or doctoral degree
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          <Divider />

          {/* Work Status */}
          <Box>
            <FormLabel component="legend" sx={{ mb: 1.5, fontWeight: 600 }}>
              Work Status <span style={{ fontWeight: 400, color: '#6B7280' }}>(Optional)</span>
            </FormLabel>
            <RadioGroup
              value={workStatus}
              onChange={(e) => setWorkStatus(e.target.value as typeof workStatus)}
            >
              {WORK_STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon size={16} />
                        <Typography variant="body2">{option.label}</Typography>
                      </Box>
                    }
                  />
                );
              })}
            </RadioGroup>
          </Box>

          <Divider />

          {/* Career Goals */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Career Goals <span style={{ fontWeight: 400, color: '#6B7280' }}>(Optional)</span>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder="e.g., Software Engineer, Data Scientist, Product Manager..."
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveAndContinue}
          disabled={saving || !canSave}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileSettingsModal;
