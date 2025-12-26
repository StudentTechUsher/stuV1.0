'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { Sparkles, Info, Upload } from 'lucide-react';
import { updateStudentClient } from '@/lib/services/profileService';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchUserCourses, type ParsedCourse } from '@/lib/services/userCoursesService';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';

interface ProfileInfoDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (profileData: ProfileData) => void;
  initialData: {
    estGradDate?: string | null;
    estGradSem?: string | null;
    careerGoals?: string | null;
  };
  userId?: string | null;
}

export interface ProfileData {
  estGradDate: string;
  estGradSem: string;
  careerGoals: string;
}

export default function ProfileInfoDialog({
  open,
  onClose,
  onNext,
  initialData,
  userId,
}: Readonly<ProfileInfoDialogProps>) {
  const supabase = createSupabaseBrowserClient();
  const [estGradDate, setEstGradDate] = useState('');
  const [estGradSem, setEstGradSem] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userCourses, setUserCourses] = useState<ParsedCourse[]>([]);
  const [hasUserCourses, setHasUserCourses] = useState<boolean | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);

  const [errors, setErrors] = useState<{
    estGradDate?: string;
    estGradSem?: string;
    careerGoals?: string;
  }>({});

  // Initialize form with existing data
  useEffect(() => {
    if (open) {
      setEstGradDate(initialData.estGradDate || '');
      setEstGradSem(initialData.estGradSem || '');
      setCareerGoals(initialData.careerGoals || '');
      setErrors({});
      setShowTranscriptUpload(false);
    }
  }, [open, initialData]);

  // Fetch user courses when dialog opens
  useEffect(() => {
    if (!open || !userId) {
      setIsLoadingCourses(false);
      setHasUserCourses(false);
      return;
    }

    const loadUserCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const coursesRecord = await fetchUserCourses(supabase, userId);

        if (coursesRecord && coursesRecord.courses && coursesRecord.courses.length > 0) {
          setHasUserCourses(true);
          setUserCourses(coursesRecord.courses);
        } else {
          setHasUserCourses(false);
          setUserCourses([]);
        }
      } catch (error) {
        console.error('Failed to fetch user courses:', error);
        setHasUserCourses(false);
        setUserCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    void loadUserCourses();
  }, [open, userId, supabase]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!estGradDate.trim()) {
      newErrors.estGradDate = 'Expected graduation date is required';
    }

    if (!estGradSem.trim()) {
      newErrors.estGradSem = 'Expected graduation semester is required';
    }

    if (!careerGoals.trim()) {
      newErrors.careerGoals = 'Career goals are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Save the student data using client-side service
      const result = await updateStudentClient({
        est_grad_date: estGradDate.trim(),
        est_grad_plan: estGradSem.trim(), // Map to est_grad_plan in student table
        career_goals: careerGoals.trim(),
      });

      if (!result.success) {
        setErrors({
          careerGoals: result.error || 'Failed to save profile. Please try again.',
        });
        return;
      }

      // Proceed to next step
      onNext({
        estGradDate: estGradDate.trim(),
        estGradSem: estGradSem.trim(),
        careerGoals: careerGoals.trim(),
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({
        careerGoals: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHelpMakeCareerGoals = () => {
    // TODO: Implement career goals helper
    console.log('Help me make career goals clicked');
  };

  const handleParsingComplete = async () => {
    // Reload user courses after transcript upload
    if (userId) {
      try {
        const coursesRecord = await fetchUserCourses(supabase, userId);
        if (coursesRecord && coursesRecord.courses) {
          setHasUserCourses(true);
          setUserCourses(coursesRecord.courses);
          setShowTranscriptUpload(false);
        }
      } catch (error) {
        console.error('Failed to reload user courses:', error);
      }
    }
  };

  const isFormValid = estGradDate.trim() && estGradSem.trim() && careerGoals.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(10,31,26,0.2)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0a1f1a' }}>
            Before We Begin
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'rgba(10,31,26,0.6)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(10,31,26,0.6)', mt: 0.5 }}>
          Let's confirm some basic information about your academic journey
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Course Display Section */}
          {!isLoadingCourses && (
            <Box
              sx={{
                p: 3,
                borderRadius: '12px',
                backgroundColor: hasUserCourses ? 'rgba(18,249,135,0.05)' : 'rgba(255,179,0,0.05)',
                border: `1px solid ${hasUserCourses ? 'rgba(18,249,135,0.3)' : 'rgba(255,179,0,0.3)'}`,
              }}
            >
              {hasUserCourses ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#0a1f1a', fontWeight: 600 }}>
                      ✓ Transcript on file ({userCourses.length} courses)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Upload size={14} />}
                      onClick={() => setShowTranscriptUpload(true)}
                      sx={{
                        fontSize: '0.75rem',
                        py: 0.5,
                        px: 1.5,
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: 'var(--hover-green)',
                          backgroundColor: 'var(--primary-15)',
                        },
                      }}
                    >
                      Re-upload
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: '120px', overflowY: 'auto' }}>
                    {userCourses.slice(0, 12).map((course, index) => (
                      <Box
                        key={course.id || `${course.subject}-${course.number}-${index}`}
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          backgroundColor: 'rgba(18,249,135,0.1)',
                          border: '1px solid rgba(18,249,135,0.3)',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0a1f1a' }}>
                          {course.subject} {course.number}
                        </Typography>
                      </Box>
                    ))}
                    {userCourses.length > 12 && (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '6px',
                          backgroundColor: 'rgba(10,31,26,0.05)',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(10,31,26,0.6)' }}>
                          +{userCourses.length - 12} more
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: '#0a1f1a', fontWeight: 600, mb: 1 }}>
                    📄 Do you have a transcript from your current university?
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(10,31,26,0.7)', fontSize: '0.875rem', mb: 2 }}>
                    Uploading your transcript helps us provide better course recommendations. If you don&apos;t have one yet, you can skip this step.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Upload size={14} />}
                      onClick={() => setShowTranscriptUpload(true)}
                      sx={{
                        fontSize: '0.875rem',
                        py: 0.75,
                        px: 2,
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: 'var(--hover-green)',
                          backgroundColor: 'var(--primary-15)',
                        },
                      }}
                    >
                      Upload Transcript
                    </Button>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'rgba(10,31,26,0.6)', ml: 1 }}>
                      (optional)
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Expected Graduation Date */}
          <TextField
            label="Expected Graduation Date"
            type="date"
            value={estGradDate}
            onChange={(e) => setEstGradDate(e.target.value)}
            error={!!errors.estGradDate}
            helperText={errors.estGradDate || 'When do you plan to graduate?'}
            fullWidth
            required
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '7px',
              },
            }}
          />

          {/* Expected Graduation Semester */}
          <TextField
            label="Expected Graduation Semester"
            value={estGradSem}
            onChange={(e) => setEstGradSem(e.target.value)}
            error={!!errors.estGradSem}
            helperText={errors.estGradSem || 'Which semester? (e.g., Spring 2026, Fall 2025)'}
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '7px',
              },
            }}
          />

          {/* Desired Career */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Desired Career <span style={{ color: '#d32f2f' }}>*</span>
                </Typography>
                <Tooltip
                  title="Don't worry! You can change your desired career at any time in your profile settings."
                  arrow
                  placement="top"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                    <Info size={16} style={{ color: 'rgba(10,31,26,0.5)' }} />
                  </Box>
                </Tooltip>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Sparkles size={14} />}
                onClick={handleHelpMakeCareerGoals}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1,
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'var(--hover-green)',
                    backgroundColor: 'var(--primary-15)',
                  },
                }}
              >
                Help me find one
              </Button>
            </Box>
            <TextField
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              error={!!errors.careerGoals}
              helperText={errors.careerGoals || 'What career are you pursuing? (e.g., Software Engineer, Mathmatician, etc.)'}
              fullWidth
              required
              placeholder="e.g., Software Engineer, Teacher, Marketing Manager..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '7px',
                },
              }}
            />
          </Box>

          {/* Info message */}
          {initialData.estGradDate && initialData.estGradSem && initialData.careerGoals && (
            <Box
              sx={{
                p: 2,
                borderRadius: '7px',
                backgroundColor: 'rgba(18,249,135,0.08)',
                border: '1px solid rgba(18,249,135,0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#0a1f1a', fontWeight: 500 }}>
                💡 We found existing information in your profile. You can update it here or keep it as is.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'rgba(10,31,26,0.7)',
            '&:hover': {
              backgroundColor: 'rgba(10,31,26,0.05)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={!isFormValid || isSaving}
          sx={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            px: 3,
            '&:hover': {
              backgroundColor: 'var(--hover-green)',
            },
            '&:disabled': {
              backgroundColor: 'rgba(10,31,26,0.3)',
              color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {isSaving ? 'Saving...' : 'Continue to Program Selection'}
        </Button>
      </DialogActions>

      {/* Transcript Upload Dialog */}
      {showTranscriptUpload && (
        <Dialog
          open={showTranscriptUpload}
          onClose={() => setShowTranscriptUpload(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(10,31,26,0.2)',
            },
          }}
        >
          <DialogTitle sx={{ pb: 1, pt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0a1f1a' }}>
                Upload Transcript
              </Typography>
              <IconButton
                onClick={() => setShowTranscriptUpload(false)}
                size="small"
                sx={{ color: 'rgba(10,31,26,0.6)' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 3 }}>
            <TranscriptUpload
              onTextExtracted={(text) => {
                console.log('Extracted text:', text);
              }}
              onParsingComplete={handleParsingComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
