'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Trash2, Plus, X } from 'lucide-react';
import CourseSearch from '@/components/grad-plan/CourseSearch';
import type { CourseOffering } from '@/lib/services/courseOfferingService';

interface CourseConfirmationStepProps {
  termIndex: number;
  termName?: string;
  gradPlanCourses: { code: string; title: string; credits: number }[];
  selectedCourses: string[];
  onCoursesChange: (courses: string[]) => void;
  totalCredits: number;
  universityId: number;
  gradPlanId?: string;
  onNext: () => void;
  onBack: () => void;
}

export default function CourseConfirmationStep({
  gradPlanCourses,
  selectedCourses,
  onCoursesChange,
  totalCredits,
  universityId,
  gradPlanId,
  termIndex,
  termName,
  onNext,
  onBack,
}: CourseConfirmationStepProps) {
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [manuallyAddedCourses, setManuallyAddedCourses] = useState<Map<string, { code: string; title: string; credits: number }>>(new Map());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    course: CourseOffering | null;
  }>({ open: false, course: null });
  const [isAddingToGradPlan, setIsAddingToGradPlan] = useState(false);

  // Debug logging
  console.log('CourseConfirmationStep rendered with:', {
    termName,
    termIndex,
    gradPlanCoursesCount: gradPlanCourses.length,
    gradPlanCourses,
    selectedCourses
  });

  const handleRemoveCourse = (courseCode: string) => {
    onCoursesChange(selectedCourses.filter(c => c !== courseCode));
    // Also remove from manually added courses if it exists there
    if (manuallyAddedCourses.has(courseCode)) {
      const newMap = new Map(manuallyAddedCourses);
      newMap.delete(courseCode);
      setManuallyAddedCourses(newMap);
    }
  };

  const handleCourseSelect = (course: CourseOffering) => {
    // Check if course is already selected
    if (selectedCourses.includes(course.course_code)) {
      return; // Don't add duplicates
    }

    // Check if this course is already in the grad plan
    const isInGradPlan = gradPlanCourses.some(c => c.code === course.course_code);

    if (!isInGradPlan && gradPlanId) {
      // Show confirmation dialog to add to grad plan
      setConfirmDialog({ open: true, course });
    } else {
      // Just add to schedule (already in grad plan or no grad plan ID)
      addCourseToSchedule(course);
    }
  };

  const addCourseToSchedule = (course: CourseOffering) => {
    // Add the course code to selected courses
    onCoursesChange([...selectedCourses, course.course_code]);

    // Store the course details for manually added courses
    const newMap = new Map(manuallyAddedCourses);
    newMap.set(course.course_code, {
      code: course.course_code,
      title: course.title,
      credits: course.credits_decimal || 3,
    });
    setManuallyAddedCourses(newMap);

    // Close the search after selection
    setShowCourseSearch(false);
  };

  const handleConfirmAddToGradPlan = async (addToGradPlan: boolean) => {
    const course = confirmDialog.course;
    if (!course) return;

    if (addToGradPlan && gradPlanId) {
      const courseCredits = course.credits_decimal || 3;
      const newTotalCredits = totalCredits + courseCredits;

      // Check if adding would exceed 18 credits
      if (newTotalCredits > 18) {
        alert(`Adding this course would bring the total to ${newTotalCredits} credits, which exceeds the maximum of 18 credits per term.`);
        setConfirmDialog({ open: false, course: null });
        return;
      }

      setIsAddingToGradPlan(true);
      try {
        // Add course to grad plan
        const response = await fetch('/api/grad-plan/add-course-to-term', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gradPlanId,
            termIndex,
            course: {
              code: course.course_code,
              title: course.title,
              credits: courseCredits,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add course to grad plan');
        }

        // Successfully added to grad plan
        addCourseToSchedule(course);
      } catch (error) {
        console.error('Error adding course to grad plan:', error);
        alert('Failed to add course to graduation plan. The course will still be added to your schedule.');
        addCourseToSchedule(course);
      } finally {
        setIsAddingToGradPlan(false);
        setConfirmDialog({ open: false, course: null });
      }
    } else {
      // Just add to schedule without updating grad plan
      addCourseToSchedule(course);
      setConfirmDialog({ open: false, course: null });
    }
  };

  const getCreditWarning = () => {
    if (totalCredits < 12) {
      return {
        severity: 'warning' as const,
        message: `You have ${totalCredits} credits selected. Full-time status typically requires 12+ credits.`,
      };
    }
    if (totalCredits > 18) {
      return {
        severity: 'warning' as const,
        message: `You have ${totalCredits} credits selected. This exceeds the typical maximum of 18 credits.`,
      };
    }
    return null;
  };

  const warning = getCreditWarning();

  // Merge grad plan courses with manually added courses
  const allAvailableCourses = new Map<string, { code: string; title: string; credits: number }>();

  // Add grad plan courses
  gradPlanCourses.forEach(course => {
    allAvailableCourses.set(course.code, course);
  });

  // Add manually added courses (these override if there's a duplicate)
  manuallyAddedCourses.forEach((course, code) => {
    allAvailableCourses.set(code, course);
  });

  // Find course details for selected courses
  const selectedCourseDetails = selectedCourses
    .map(code => allAvailableCourses.get(code))
    .filter((course): course is { code: string; title: string; credits: number } => course !== undefined);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Confirm Your Courses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review and adjust courses from your graduation plan
        </Typography>
      </Box>

      {/* Credit Display */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'rgba(6, 201, 108, 0.08)',
          border: '2px solid #06C96C',
          borderRadius: 3,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#06C96C' }}>
          {totalCredits}
        </Typography>
        <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
          Total Credits
        </Typography>
      </Paper>

      {warning && (
        <Alert severity={warning.severity}>
          {warning.message}
        </Alert>
      )}

      {/* Add Course Section */}
      <Box>
        {!showCourseSearch ? (
          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() => setShowCourseSearch(true)}
            sx={{
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              '&:hover': {
                borderColor: 'var(--hover-green)',
                bgcolor: 'var(--primary-15)',
              },
            }}
          >
            Add Course
          </Button>
        ) : (
          <Paper elevation={0} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <CourseSearch
                  universityId={universityId}
                  onSelect={handleCourseSelect}
                  placeholder="Search for a course to add..."
                  label="Add Course"
                  autoFocus
                />
              </Box>
              <Button
                variant="text"
                onClick={() => setShowCourseSearch(false)}
                sx={{ mt: 0.5 }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Course List */}
      {selectedCourseDetails.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Course Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Credits</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedCourseDetails.map((course) => (
                <TableRow key={course.code}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {course.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {course.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {course.credits}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveCourse(course.code)}
                      sx={{ color: 'var(--action-cancel)' }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          No courses selected. Add courses from your graduation plan to continue.
        </Alert>
      )}

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
          disabled={selectedCourses.length === 0}
          sx={{
            bgcolor: '#06C96C',
            color: 'black',
            '&:hover': { bgcolor: '#059669' },
            fontWeight: 600,
          }}
        >
          Next: Set Preferences
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, course: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" className="font-header">
              Add to Graduation Plan?
            </Typography>
            <IconButton onClick={() => setConfirmDialog({ open: false, course: null })} size="small">
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to add <strong>{confirmDialog.course?.course_code}</strong> ({confirmDialog.course?.title})
            to your graduation plan for this term?
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            Credits: {confirmDialog.course?.credits_decimal || 3} |
            New Total: {totalCredits + (confirmDialog.course?.credits_decimal || 3)} / 18
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            type="button"
            onClick={() => handleConfirmAddToGradPlan(false)}
            disabled={isAddingToGradPlan}
            className="font-body-semi"
          >
            No, Schedule Only
          </Button>
          <Button
            type="button"
            onClick={() => handleConfirmAddToGradPlan(true)}
            variant="contained"
            disabled={isAddingToGradPlan}
            className="font-body-semi"
            sx={{
              bgcolor: 'var(--primary)',
              '&:hover': { bgcolor: 'var(--hover-green)' },
            }}
          >
            {isAddingToGradPlan ? 'Adding...' : 'Yes, Add to Plan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
