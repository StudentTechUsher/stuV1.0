/**
 * Profile Check Step Component
 *
 * Verifies user has required profile data for grad plan creation.
 * Shows summary if complete, or prompts to fill in missing fields.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { CheckCircle, Edit, AlertCircle, BookOpen, GraduationCap, Compass, Award } from 'lucide-react';

interface StudentPlanningData {
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  year_in_school: string | null;
  student_type: 'undergraduate' | 'honor' | 'graduate' | null;
  career_goals: string | null;
  is_transfer: 'transfer' | 'freshman' | null;
}

interface ProfileCheckStepProps {
  userId: string;
  onComplete: () => void;
  onFetchStudentData: () => Promise<StudentPlanningData>;
  onUpdateStudentData: (data: Partial<StudentPlanningData>) => Promise<void>;
  onCareerPathfinderClick?: () => void;
  readOnly?: boolean;
  reviewMode?: boolean;
}

const REQUIRED_FIELDS = [
  'est_grad_date',
  'est_grad_term',
  'admission_year',
  'student_type',
  'is_transfer',
] as const;

const GRAD_TERMS = ['Fall', 'Winter', 'Spring', 'Summer'];

export function ProfileCheckStep({
  userId,
  onComplete,
  onFetchStudentData,
  onUpdateStudentData,
  onCareerPathfinderClick,
  readOnly,
  reviewMode,
}: ProfileCheckStepProps) {
  const isReadOnly = Boolean(readOnly || reviewMode);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentPlanningData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentPlanningData>>({});
  const [gradYearInput, setGradYearInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatStudentType = (type?: string | null) => {
    if (!type) return '';
    if (type === 'honor') return 'Honors';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatAdmissionType = (value?: string | null) => {
    if (!value) return 'Not set';
    if (value === 'freshman') return 'Admitted as a freshman';
    if (value === 'transfer') return 'Admitted as Transfer';
    return value;
  };

  const deriveGradYear = (date?: string | null) => {
    if (!date) return '';
    const year = new Date(date).getFullYear();
    return Number.isNaN(year) ? '' : String(year);
  };

  // Fetch student data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await onFetchStudentData();
        setStudentData(data);

        // Check for missing required fields
        const missing = REQUIRED_FIELDS.filter(field => !data[field]);
        setMissingFields(missing);

        // Auto-show edit form if fields are missing
        if (missing.length > 0) {
          setFormData(data);
          setGradYearInput(deriveGradYear(data.est_grad_date));
          setIsEditing(true);
        }
      } catch (err) {
        console.error('Failed to fetch student planning data:', err);
        setError('Failed to load your profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, onFetchStudentData]);

  const handleSave = async () => {
    if (isReadOnly) return;
    try {
      setSaving(true);
      setError(null);

      const currentYear = new Date().getFullYear();
      const gradYearSchema = z
        .string()
        .trim()
        .refine(value => value.length > 0, { message: 'Estimated graduation year is required.' })
        .transform(value => parseInt(value, 10))
        .refine(value => !Number.isNaN(value), { message: 'Estimated graduation year must be a number.' })
        .refine(value => value >= currentYear, {
          message: `Estimated graduation year must be ${currentYear} or later.`,
        });

      const gradYearResult = gradYearSchema.safeParse(gradYearInput);
      if (!gradYearResult.success) {
        setError(gradYearResult.error.issues[0]?.message || 'Invalid graduation year.');
        return;
      }

      const nextFormData: Partial<StudentPlanningData> = {
        ...formData,
        est_grad_date: `${gradYearResult.data}-01-01`,
      };

      // Validate required fields
      const stillMissing = REQUIRED_FIELDS.filter(field => !nextFormData[field]);
      if (stillMissing.length > 0) {
        setError(`Please fill in: ${stillMissing.join(', ')}`);
        return;
      }

      setFormData(nextFormData);
      await onUpdateStudentData(nextFormData);

      // Refetch to get updated data
      const updatedData = await onFetchStudentData();
      setStudentData(updatedData);
      setMissingFields([]);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save student data:', err);
      setError('Failed to save your settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    if (isReadOnly) return;
    setFormData(studentData || {});
    setGradYearInput(deriveGradYear(studentData?.est_grad_date));
    setIsEditing(true);
  };

  const handleCareerPathfinder = () => {
    if (onCareerPathfinderClick) {
      onCareerPathfinderClick();
      return;
    }

    setFormData(prev => ({
      ...prev,
      career_goals: 'Software Engineer',
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isComplete = missingFields.length === 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', ...(isReadOnly ? { pointerEvents: 'none', opacity: 0.8 } : {}) }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Show edit form if editing or incomplete */}
      {isEditing ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Student Profile
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Graduation Term & Year - Two Columns */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel>Estimated Graduation Term</InputLabel>
                  <Select
                    value={formData.est_grad_term || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, est_grad_term: e.target.value as string })
                    }
                    label="Estimated Graduation Term"
                  >
                    {GRAD_TERMS.map(term => (
                      <MenuItem key={term} value={term}>
                        {term}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Estimated Graduation Year"
                  required
                  fullWidth
                  value={gradYearInput}
                  onChange={(e) => setGradYearInput(e.target.value)}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric' }
                  }}
                />
              </Box>

              {/* Admission Year & Transfer Status - Two Columns */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  label="Admission Year"
                  type="number"
                  required
                  fullWidth
                  value={formData.admission_year || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, admission_year: parseInt(e.target.value) })
                  }
                  slotProps={{
                    htmlInput: { min: 1950, max: new Date().getFullYear() }
                  }}
                />

                <FormControl fullWidth required>
                  <InputLabel>Admission Type</InputLabel>
                  <Select
                    value={formData.is_transfer || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, is_transfer: e.target.value as 'transfer' | 'freshman' });
                    }}
                    label="Admission Type"
                  >
                    <MenuItem value="freshman">I was admitted as a freshman</MenuItem>
                    <MenuItem value="transfer">I transferred from another college or university</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Student Type - Card Buttons */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                  Student Type <span style={{ color: '#DC2626' }}>*</span>
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {/* Undergraduate Card */}
                  <Box
                    onClick={() => setFormData({ ...formData, student_type: 'undergraduate' })}
                    sx={{
                      position: 'relative',
                      p: 3,
                      border: '2px solid',
                      borderColor: formData.student_type === 'undergraduate' ? '#0A0A0A' : 'var(--border)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      bgcolor: formData.student_type === 'undergraduate' ? 'rgba(10, 10, 10, 0.05)' : 'background.paper',
                      '&:hover': {
                        borderColor: '#0A0A0A',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: formData.student_type === 'undergraduate' ? '#0A0A0A' : 'var(--muted)',
                          color: formData.student_type === 'undergraduate' ? 'white' : 'text.secondary',
                        }}
                      >
                        <BookOpen size={32} />
                      </Box>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Undergraduate
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Pursuing a bachelor&apos;s degree
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Honors Card */}
                  <Box
                    onClick={() => setFormData({ ...formData, student_type: 'honor' })}
                    sx={{
                      position: 'relative',
                      p: 3,
                      border: '2px solid',
                      borderColor: formData.student_type === 'honor' ? '#0A0A0A' : 'var(--border)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      bgcolor: formData.student_type === 'honor' ? 'rgba(10, 10, 10, 0.05)' : 'background.paper',
                      '&:hover': {
                        borderColor: '#0A0A0A',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: formData.student_type === 'honor' ? '#0A0A0A' : 'var(--muted)',
                          color: formData.student_type === 'honor' ? 'white' : 'text.secondary',
                        }}
                      >
                        <Award size={32} />
                      </Box>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Honors
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Undergraduate honors student
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Graduate Card */}
                  <Box
                    onClick={() => setFormData({ ...formData, student_type: 'graduate' })}
                    sx={{
                      position: 'relative',
                      p: 3,
                      border: '2px solid',
                      borderColor: formData.student_type === 'graduate' ? '#0A0A0A' : 'var(--border)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      bgcolor: formData.student_type === 'graduate' ? 'rgba(10, 10, 10, 0.05)' : 'background.paper',
                      '&:hover': {
                        borderColor: '#0A0A0A',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: formData.student_type === 'graduate' ? '#0A0A0A' : 'var(--muted)',
                          color: formData.student_type === 'graduate' ? 'white' : 'text.secondary',
                        }}
                      >
                        <GraduationCap size={32} />
                      </Box>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Graduate
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Pursuing a master&apos;s or doctoral degree
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Career Goals (Optional) */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Career Goals <span style={{ fontWeight: 400, color: '#6B7280' }}>(Optional)</span>
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="text"
                    onClick={handleCareerPathfinder}
                    startIcon={<Compass size={18} />}
                    sx={{
                      color: '#0A0A0A',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(10, 10, 10, 0.05)',
                      },
                    }}
                  >
                    Need help finding your career path?
                  </Button>
                </Box>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.career_goals || ''}
                  onChange={(e) => setFormData({ ...formData, career_goals: e.target.value })}
                  placeholder="e.g., Software Engineer, Data Scientist, Product Manager..."
                />
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {isComplete && (
                <Button
                  onClick={() => setIsEditing(false)}
                  sx={{
                    color: '#0A0A0A',
                    '&:hover': {
                      bgcolor: 'rgba(10, 10, 10, 0.05)',
                    },
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : null}
                sx={{
                  bgcolor: '#0A0A0A',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#1A1A1A',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(10, 10, 10, 0.3)',
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : isComplete ? (
        <Card
          sx={{
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 4,
              bgcolor: 'rgba(16, 185, 129, 0.35)',
            }}
          />
          <CardContent sx={{ pl: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle size={18} color="#059669" />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                    Profile Complete
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Your academic planning settings are ready.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 999,
                  bgcolor: 'rgba(16, 185, 129, 0.12)',
                  color: '#047857',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Complete
              </Box>
            </Box>

            {/* Profile Summary */}
            {studentData && (
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Admission Year
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.admission_year}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Graduation Year
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.est_grad_term} {new Date(studentData.est_grad_date!).getFullYear()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Admission Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatAdmissionType(studentData.is_transfer)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Current Year in School
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.year_in_school || 'Not set'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Career Goals
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.career_goals || 'Not set'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="text"
                startIcon={<Edit size={16} />}
                onClick={handleEditClick}
                sx={(theme) => ({
                  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.text.primary,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                })}
              >
                Edit Settings
              </Button>
              <Button
                variant="contained"
                onClick={onComplete}
                sx={{
                  flex: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                Continue to Program Selection
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <AlertCircle size={32} color="orange" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Complete Your Profile
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  We need a few more details to create your graduation plan. Please fill in the missing
                  information.
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Missing: {missingFields.join(', ')}
                </Alert>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default ProfileCheckStep;
