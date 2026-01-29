/**
 * Academic Planning Settings Form Component
 *
 * Form for managing academic planning settings in user profile
 * Handles graduation timeline, student type, work status, and career goals
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { Save, UserX, Clock, Briefcase, Calendar } from 'lucide-react';

interface StudentPlanningData {
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  is_transfer: boolean | null;
  student_type: 'undergraduate' | 'honor' | 'graduate' | null;
  work_status: 'not_working' | 'part_time' | 'full_time' | 'variable' | null;
  career_goals: string | null;
}

interface AcademicPlanningSettingsFormProps {
  userId: string;
  currentStudentData: StudentPlanningData | null;
  onUpdate?: () => void;
  onUpdateGraduationTimeline: (data: {
    est_grad_date?: string | null;
    est_grad_term?: string | null;
    admission_year?: number | null;
  }) => Promise<void>;
  onUpdateStudentType: (studentType: 'undergraduate' | 'honor' | 'graduate') => Promise<void>;
  onUpdateWorkStatus: (workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable') => Promise<void>;
  onUpdateCareerGoals: (careerGoals: string | null) => Promise<void>;
}

const GRAD_TERMS = ['Fall', 'Winter', 'Spring', 'Summer'];

const WORK_STATUS_OPTIONS = [
  { value: 'not_working', label: 'Not Working', icon: UserX },
  { value: 'part_time', label: 'Part-time (10-20 hrs/week)', icon: Clock },
  { value: 'full_time', label: 'Full-time (30+ hrs/week)', icon: Briefcase },
  { value: 'variable', label: 'Variable Schedule', icon: Calendar },
];

export function AcademicPlanningSettingsForm({
  userId: _userId,
  currentStudentData,
  onUpdate,
  onUpdateGraduationTimeline,
  onUpdateStudentType,
  onUpdateWorkStatus,
  onUpdateCareerGoals,
}: AcademicPlanningSettingsFormProps) {
  // Form state
  const [gradTerm, setGradTerm] = useState<string>('');
  const [gradYear, setGradYear] = useState<string>('');
  const [admissionYear, setAdmissionYear] = useState<string>('');
  const [studentType, setStudentType] = useState<'undergraduate' | 'honor' | 'graduate' | ''>('');
  const [workStatus, setWorkStatus] = useState<'not_working' | 'part_time' | 'full_time' | 'variable' | ''>('');
  const [careerGoals, setCareerGoals] = useState<string>('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with current data
  useEffect(() => {
    if (currentStudentData) {
      setGradTerm(currentStudentData.est_grad_term || '');
      if (currentStudentData.est_grad_date) {
        const year = new Date(currentStudentData.est_grad_date).getFullYear();
        setGradYear(year.toString());
      }
      setAdmissionYear(currentStudentData.admission_year?.toString() || '');
      setStudentType(currentStudentData.student_type || '');
      setWorkStatus(currentStudentData.work_status || '');
      setCareerGoals(currentStudentData.career_goals || '');
    }
  }, [currentStudentData]);

  // Track changes
  useEffect(() => {
    if (!currentStudentData) {
      setHasChanges(false);
      return;
    }

    const currentGradYear = currentStudentData.est_grad_date
      ? new Date(currentStudentData.est_grad_date).getFullYear().toString()
      : '';

    const changed =
      gradTerm !== (currentStudentData.est_grad_term || '') ||
      gradYear !== currentGradYear ||
      admissionYear !== (currentStudentData.admission_year?.toString() || '') ||
      studentType !== (currentStudentData.student_type || '') ||
      workStatus !== (currentStudentData.work_status || '') ||
      careerGoals !== (currentStudentData.career_goals || '');

    setHasChanges(changed);
  }, [gradTerm, gradYear, admissionYear, studentType, workStatus, careerGoals, currentStudentData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Update graduation timeline if any timeline fields changed
      const timelineChanged =
        gradTerm !== (currentStudentData?.est_grad_term || '') ||
        gradYear !== (currentStudentData?.est_grad_date ? new Date(currentStudentData.est_grad_date).getFullYear().toString() : '') ||
        admissionYear !== (currentStudentData?.admission_year?.toString() || '');

      if (timelineChanged) {
        await onUpdateGraduationTimeline({
          est_grad_term: gradTerm || null,
          est_grad_date: gradYear ? `${gradYear}-01-01` : null,
          admission_year: admissionYear ? parseInt(admissionYear) : null,
        });
      }

      // Update student type if changed
      if (studentType && studentType !== (currentStudentData?.student_type || '')) {
        await onUpdateStudentType(studentType);
      }

      // Update work status if changed
      if (workStatus && workStatus !== (currentStudentData?.work_status || '')) {
        await onUpdateWorkStatus(workStatus);
      }

      // Update career goals if changed
      if (careerGoals !== (currentStudentData?.career_goals || '')) {
        await onUpdateCareerGoals(careerGoals || null);
      }

      setSuccessMessage('Settings saved successfully!');
      setHasChanges(false);

      // Call parent update callback
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save academic planning settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Graduation Timeline Section */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Graduation Timeline
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Graduation Term</InputLabel>
              <Select
                value={gradTerm}
                onChange={(e) => setGradTerm(e.target.value)}
                label="Graduation Term"
              >
                <MenuItem value="">
                  <em>Not set</em>
                </MenuItem>
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
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              inputProps={{ min: currentYear, max: currentYear + 10 }}
            />

            <TextField
              label="Admission Year"
              type="number"
              value={admissionYear}
              onChange={(e) => setAdmissionYear(e.target.value)}
              inputProps={{ min: 1950, max: currentYear }}
            />
          </Box>

          {currentStudentData?.is_transfer && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Transfer Student: Yes
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Student Type Section */}
      <Card variant="outlined">
        <CardContent>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Student Type
          </FormLabel>
          <RadioGroup
            value={studentType}
            onChange={(e) => setStudentType(e.target.value as 'undergraduate' | 'honor' | 'graduate')}
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
                    Pursuing a bachelor's degree
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="honor"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Honors
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Undergraduate honors student
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
                    Pursuing a master's or doctoral degree
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Work Status Section */}
      <Card variant="outlined">
        <CardContent>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Work Status During Studies
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
        </CardContent>
      </Card>

      {/* Career Goals Section */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Career Goals <span style={{ fontWeight: 400, color: '#6B7280' }}>(Optional)</span>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="e.g., Software Engineer at a tech company, Data Scientist in healthcare, Product Manager..."
            helperText="Share your career aspirations to help us tailor your graduation plan"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          startIcon={saving ? <CircularProgress size={20} /> : <Save size={20} />}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
}

export default AcademicPlanningSettingsForm;
