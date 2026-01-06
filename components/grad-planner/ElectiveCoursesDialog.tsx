'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import { Sparkles, Plus, X } from 'lucide-react';
import {
  getCollegesAction,
  getDepartmentCodesAction,
  getCoursesByDepartmentAction,
} from '@/lib/services/server-actions';

interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
}

interface ElectiveCoursesDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (selectedElectives: Course[]) => void;
  universityId: number;
}

export default function ElectiveCoursesDialog({
  open,
  onClose,
  onNext,
  universityId,
}: Readonly<ElectiveCoursesDialogProps>) {
  // Three-step dropdown state
  const [colleges, setColleges] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);

  // Selection state
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Selected electives list
  const [selectedElectives, setSelectedElectives] = useState<Course[]>([]);

  // Loading and error state
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load colleges when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchColleges = async () => {
      setLoadingColleges(true);
      setError(null);
      try {
        const result = await getCollegesAction(universityId);
        if (result.success && result.colleges) {
          setColleges(result.colleges);
        } else {
          setError(result.error || 'Failed to load colleges');
        }
      } catch (err) {
        console.error('Error fetching colleges:', err);
        setError('Failed to load colleges. Please try again.');
      } finally {
        setLoadingColleges(false);
      }
    };

    fetchColleges();
  }, [open, universityId]);

  // Load departments when college is selected
  useEffect(() => {
    if (!selectedCollege) {
      setDepartments([]);
      setSelectedDepartment('');
      return;
    }

    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      setError(null);
      try {
        const result = await getDepartmentCodesAction(universityId, selectedCollege);
        if (result.success && result.departments) {
          setDepartments(result.departments);
        } else {
          setError(result.error || 'Failed to load departments');
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments. Please try again.');
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, [selectedCollege, universityId]);

  // Load courses when department is selected
  useEffect(() => {
    if (!selectedDepartment || !selectedCollege) {
      setAvailableCourses([]);
      return;
    }

    const fetchCourses = async () => {
      setLoadingCourses(true);
      setError(null);
      try {
        const result = await getCoursesByDepartmentAction(
          universityId,
          selectedCollege,
          selectedDepartment
        );
        if (result.success && result.courses) {
          // Transform to Course format
          const courses: Course[] = result.courses.map(c => ({
            id: c.offering_id.toString(),
            code: c.course_code,
            title: c.title,
            credits: c.credits_decimal || 0,
          }));
          setAvailableCourses(courses);
        } else {
          setError(result.error || 'Failed to load courses');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [selectedDepartment, selectedCollege, universityId]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedElectives([]);
      setSelectedCollege('');
      setSelectedDepartment('');
      setSelectedCourse(null);
      setError(null);
    }
  }, [open]);

  const handleAddCourse = () => {
    if (!selectedCourse) return;

    // Check if already added
    if (selectedElectives.find(e => e.id === selectedCourse.id)) {
      setError('This course is already in your list');
      return;
    }

    setSelectedElectives(prev => [...prev, selectedCourse]);
    setSelectedCourse(null);
    setError(null);
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedElectives(prev => prev.filter(e => e.id !== courseId));
  };

  const handleNext = () => {
    onNext(selectedElectives);
  };

  const handleHelpFindElectives = () => {
    // TODO: Implement elective finder helper
    console.log('Help me find good options clicked');
  };

  const isLoading = loadingColleges || loadingDepartments || loadingCourses;

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
            Additional Elective Courses
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(10,31,26,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(10,31,26,0.6)', mt: 0.5 }}>
          Add any elective courses you'd like to include in your plan (optional)
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Box
              sx={{
                p: 2,
                borderRadius: '7px',
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                {error}
              </Typography>
            </Box>
          )}

          {/* Three-step dropdowns */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Add Elective Courses
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Sparkles size={14} />}
                onClick={handleHelpFindElectives}
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
                Help me find good options
              </Button>
            </Box>

            {/* Step 1: College */}
            <TextField
              select
              fullWidth
              label="1. Select College"
              value={selectedCollege}
              onChange={(e) => {
                setSelectedCollege(e.target.value);
                setSelectedDepartment('');
                setSelectedCourse(null);
              }}
              disabled={loadingColleges}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '7px',
                },
              }}
            >
              {loadingColleges ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : colleges.length === 0 ? (
                <MenuItem value="" disabled>
                  No colleges available
                </MenuItem>
              ) : (
                colleges.map((college) => (
                  <MenuItem key={college} value={college}>
                    {college}
                  </MenuItem>
                ))
              )}
            </TextField>

            {/* Step 2: Department */}
            <TextField
              select
              fullWidth
              label="2. Select Department"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedCourse(null);
              }}
              disabled={!selectedCollege || loadingDepartments}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '7px',
                },
              }}
            >
              {loadingDepartments ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : departments.length === 0 ? (
                <MenuItem value="" disabled>
                  {selectedCollege ? 'No departments available' : 'Select a college first'}
                </MenuItem>
              ) : (
                departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))
              )}
            </TextField>

            {/* Step 3: Course */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                select
                fullWidth
                label="3. Select Course"
                value={selectedCourse?.id || ''}
                onChange={(e) => {
                  const course = availableCourses.find(c => c.id === e.target.value);
                  setSelectedCourse(course || null);
                }}
                disabled={!selectedDepartment || loadingCourses}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '7px',
                  },
                }}
              >
                {loadingCourses ? (
                  <MenuItem value="">
                    <CircularProgress size={20} />
                  </MenuItem>
                ) : availableCourses.length === 0 ? (
                  <MenuItem value="" disabled>
                    {selectedDepartment ? 'No courses available' : 'Select a department first'}
                  </MenuItem>
                ) : (
                  availableCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.code} - {course.title} ({course.credits} cr)
                    </MenuItem>
                  ))
                )}
              </TextField>

              <Button
                variant="contained"
                onClick={handleAddCourse}
                disabled={!selectedCourse}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  backgroundColor: 'var(--primary)',
                  '&:hover': {
                    backgroundColor: 'var(--hover-green)',
                  },
                  '&:disabled': {
                    backgroundColor: 'rgba(10,31,26,0.3)',
                  },
                }}
              >
                <Plus size={20} />
              </Button>
            </Box>
          </Box>

          {/* Selected Electives List */}
          {selectedElectives.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Selected Electives ({selectedElectives.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedElectives.map((course) => (
                  <Chip
                    key={course.id}
                    label={`${course.code} (${course.credits} cr)`}
                    onDelete={() => handleRemoveCourse(course.id)}
                    deleteIcon={<X size={16} />}
                    sx={{
                      borderRadius: '6px',
                      backgroundColor: 'rgba(18,249,135,0.12)',
                      color: '#0a1f1a',
                      '& .MuiChip-deleteIcon': {
                        color: 'rgba(10,31,26,0.6)',
                        '&:hover': {
                          color: '#0a1f1a',
                        },
                      },
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'rgba(10,31,26,0.6)' }}>
                Total: {selectedElectives.reduce((sum, course) => sum + course.credits, 0)} credits
              </Typography>
            </Box>
          )}

          {/* Info message */}
          <Box
            sx={{
              p: 2,
              borderRadius: '7px',
              backgroundColor: 'rgba(18,249,135,0.08)',
              border: '1px solid rgba(18,249,135,0.3)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#0a1f1a', fontWeight: 500 }}>
              💡 You can skip this step and add electives later, or let our AI suggest courses based on your program requirements.
            </Typography>
          </Box>
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
          sx={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            px: 3,
            '&:hover': {
              backgroundColor: 'var(--hover-green)',
            },
          }}
        >
          Continue to Plan Creation
        </Button>
      </DialogActions>
    </Dialog>
  );
}
