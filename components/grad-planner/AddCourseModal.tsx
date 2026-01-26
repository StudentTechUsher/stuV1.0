'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Plus, X } from 'lucide-react';
import {
  getAllDepartmentCodes,
  getCoursesByDepartmentCode,
  CourseOffering,
  CourseOfferingFetchError,
} from '@/lib/services/courseOfferingService';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onAddCourse: (course: { code: string; title: string; credits: number }) => void;
  universityId: number;
}

export function AddCourseModal({
  open,
  onClose,
  onAddCourse,
  universityId,
}: Readonly<AddCourseModalProps>) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseOffering | null>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);




  const loadDepartments = React.useCallback(async () => {
    setLoadingDepartments(true);
    setError(null);
    try {
      const deps = await getAllDepartmentCodes(universityId);
      setDepartments(deps);
    } catch (err) {
      console.error('Error loading departments:', err);
      setError(
        err instanceof CourseOfferingFetchError
          ? err.message
          : 'Failed to load departments'
      );
    } finally {
      setLoadingDepartments(false);
    }
  }, [universityId]);


  const loadCourses = React.useCallback(async (departmentCode: string) => {
    setLoadingCourses(true);
    setError(null);
    try {
      const coursesData = await getCoursesByDepartmentCode(universityId, departmentCode);
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError(
        err instanceof CourseOfferingFetchError
          ? err.message
          : 'Failed to load courses'
      );
    } finally {
      setLoadingCourses(false);
    }
  }, [universityId]);

  // Load departments when modal opens
  useEffect(() => {
    if (open) {
      loadDepartments();
    } else {
      // Reset state when modal closes
      setSelectedDepartment('');
      setCourses([]);
      setSelectedCourse(null);
      setError(null);
    }
  }, [open, loadDepartments]);

  // Load courses when department changes
  useEffect(() => {
    if (selectedDepartment) {
      loadCourses(selectedDepartment);
    } else {
      setCourses([]);
      setSelectedCourse(null);
    }
  }, [selectedDepartment, loadCourses]);

  const handleAddCourse = () => {
    if (selectedCourse) {
      onAddCourse({
        code: selectedCourse.course_code,
        title: selectedCourse.title,
        credits: selectedCourse.credits_decimal || 0,
      });
      onClose();
    }
  };

  const handleCourseSelect = (offeringId: number) => {
    const course = courses.find(c => c.offering_id === offeringId);
    setSelectedCourse(course || null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '7px',
          border: '1px solid color-mix(in srgb, rgba(10,31,26,0.16) 35%, var(--border) 65%)',
          boxShadow: '0 56px 120px -90px rgba(10,31,26,0.55)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontFamily: '"Red Hat Display", sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: '#0a1f1a',
          }}
        >
          Add Course to Term
        </Typography>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 'auto',
            p: 1,
            color: 'var(--muted-foreground)',
            '&:hover': {
              backgroundColor: 'var(--muted)',
            },
          }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: '7px' }}>
              {error}
            </Alert>
          )}

          {/* Department Selection */}
          <FormControl fullWidth>
            <InputLabel id="department-select-label">Department</InputLabel>
            <Select
              labelId="department-select-label"
              id="department-select"
              value={selectedDepartment}
              label="Department"
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={loadingDepartments}
              sx={{ borderRadius: '7px' }}
            >
              {loadingDepartments ? (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <span>Loading departments...</span>
                  </Box>
                </MenuItem>
              ) : departments.length === 0 ? (
                <MenuItem disabled>No departments available</MenuItem>
              ) : (
                departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {/* Course Selection */}
          {selectedDepartment && (
            <FormControl fullWidth>
              <InputLabel id="course-select-label">Course</InputLabel>
              <Select
                labelId="course-select-label"
                id="course-select"
                value={selectedCourse?.offering_id || ''}
                label="Course"
                onChange={(e) => handleCourseSelect(e.target.value as number)}
                disabled={loadingCourses}
                sx={{ borderRadius: '7px' }}
              >
                {loadingCourses ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <span>Loading courses...</span>
                    </Box>
                  </MenuItem>
                ) : courses.length === 0 ? (
                  <MenuItem disabled>No courses available for this department</MenuItem>
                ) : (
                  courses.map((course) => (
                    <MenuItem key={course.offering_id} value={course.offering_id}>
                      {course.course_code} - {course.title} ({course.credits_decimal || 0} credits)
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          {/* Course Details */}
          {selectedCourse && (
            <Box
              sx={{
                p: 3,
                borderRadius: '7px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--muted)',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  mb: 1,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Course Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'var(--foreground)', mb: 0.5 }}
                  >
                    {selectedCourse.course_code}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--muted-foreground)' }}>
                    {selectedCourse.title}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: 'var(--foreground)' }}
                  >
                    Credits: {selectedCourse.credits_decimal || 0}
                  </Typography>
                </Box>
                {selectedCourse.description && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        display: 'block',
                        mb: 0.5,
                      }}
                    >
                      Description:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'var(--muted-foreground)',
                        display: 'block',
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedCourse.description}
                    </Typography>
                  </Box>
                )}
                {selectedCourse.prerequisites && (
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        display: 'block',
                        mb: 0.5,
                      }}
                    >
                      Prerequisites:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'var(--muted-foreground)',
                        display: 'block',
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedCourse.prerequisites}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid var(--border)' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: 'var(--border)',
            color: 'var(--muted-foreground)',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '7px',
            '&:hover': {
              borderColor: 'var(--muted-foreground)',
              backgroundColor: 'var(--muted)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddCourse}
          disabled={!selectedCourse}
          variant="contained"
          startIcon={<Plus size={16} />}
          sx={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '7px',
            '&:hover': {
              backgroundColor: 'var(--hover-green)',
            },
            '&:disabled': {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            },
          }}
        >
          Add Course
        </Button>
      </DialogActions>
    </Dialog>
  );
}
