/**
 * Profile Check Step Component
 *
 * Verifies user has required profile data for grad plan creation.
 * Shows summary if complete, or prompts to fill in missing fields.
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { CheckCircle, Edit, AlertCircle, BookOpen, GraduationCap, Compass } from 'lucide-react';

interface StudentPlanningData {
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  student_type: 'undergraduate' | 'graduate' | null;
  career_goals: string | null;
  is_transfer: 'transfer' | 'freshman' | null;
}

interface ProfileCheckStepProps {
  userId: string;
  onComplete: () => void;
  onFetchStudentData: () => Promise<StudentPlanningData>;
  onUpdateStudentData: (data: Partial<StudentPlanningData>) => Promise<void>;
  onCareerPathfinderClick?: () => void;
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
}: ProfileCheckStepProps) {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentPlanningData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentPlanningData>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      setSaving(true);
      setError(null);

      // Validate required fields
      const stillMissing = REQUIRED_FIELDS.filter(field => !formData[field]);
      if (stillMissing.length > 0) {
        setError(`Please fill in: ${stillMissing.join(', ')}`);
        return;
      }

      await onUpdateStudentData(formData);

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
    setFormData(studentData || {});
    setIsEditing(true);
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
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
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
                  type="number"
                  required
                  fullWidth
                  value={
                    formData.est_grad_date
                      ? new Date(formData.est_grad_date).getFullYear()
                      : ''
                  }
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    if (!isNaN(year)) {
                      setFormData({ ...formData, est_grad_date: `${year}-01-01` });
                    }
                  }}
                  slotProps={{
                    htmlInput: { min: new Date().getFullYear(), max: new Date().getFullYear() + 10 }
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
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
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
                {onCareerPathfinderClick && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="text"
                      onClick={onCareerPathfinderClick}
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
                )}
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
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <CheckCircle size={32} color="green" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Profile Complete
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Your academic planning settings are ready. Review the details below or continue to
                  program selection.
                </Typography>
              </Box>
            </Box>

            {/* Profile Summary */}
            {studentData && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Graduation
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.est_grad_term} {new Date(studentData.est_grad_date!).getFullYear()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Admission Year
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentData.admission_year}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Student Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {studentData.student_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Admission Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {studentData.is_transfer || 'Not set'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Edit size={16} />}
                onClick={handleEditClick}
                sx={{
                  borderColor: '#0A0A0A',
                  color: '#0A0A0A',
                  '&:hover': {
                    borderColor: '#1A1A1A',
                    bgcolor: 'rgba(10, 10, 10, 0.05)',
                  },
                }}
              >
                Edit Settings
              </Button>
              <Button
                variant="contained"
                onClick={onComplete}
                sx={{
                  flex: 1,
                  bgcolor: '#0A0A0A',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#1A1A1A',
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
