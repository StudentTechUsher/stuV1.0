'use client';

import { useEffect, useState } from 'react';
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
  Tooltip,
} from '@mui/material';
import { AlertCircle, Trash2, Plus, X } from 'lucide-react';
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
  onCourseIssuesChange?: (hasIssues: boolean) => void;
  onTotalCreditsChange?: (totalCredits: number) => void;
  onValidationStatusChange?: (status: { isValidating: boolean; hasValidated: boolean }) => void;
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
  onCourseIssuesChange,
  onTotalCreditsChange,
  onValidationStatusChange,
}: CourseConfirmationStepProps) {
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [manuallyAddedCourses, setManuallyAddedCourses] = useState<Map<string, { code: string; title: string; credits: number }>>(new Map());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    course: CourseOffering | null;
  }>({ open: false, course: null });
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    courseCode: string | null;
  }>({ open: false, courseCode: null });
  const [isAddingToGradPlan, setIsAddingToGradPlan] = useState(false);
  const [isUpdatingGradPlan, setIsUpdatingGradPlan] = useState(false);
  const [removePlanError, setRemovePlanError] = useState<string | null>(null);
  const [isValidatingCourses, setIsValidatingCourses] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<{
    notInTerm: Array<{ courseCode: string; availableIn?: string }>;
    notFound: Array<{ courseCode: string }>;
  } | null>(null);

  // Debug logging
  console.log('CourseConfirmationStep rendered with:', {
    termName,
    termIndex,
    gradPlanCoursesCount: gradPlanCourses.length,
    gradPlanCourses,
    selectedCourses
  });

  const removeCourseFromSchedule = (courseCode: string) => {
    onCoursesChange(selectedCourses.filter(c => c !== courseCode));
    if (manuallyAddedCourses.has(courseCode)) {
      const newMap = new Map(manuallyAddedCourses);
      newMap.delete(courseCode);
      setManuallyAddedCourses(newMap);
    }
  };

  const handleRemoveCourse = (courseCode: string) => {
    setRemovePlanError(null);
    setRemoveDialog({ open: true, courseCode });
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

  const handleConfirmRemoveFromPlan = async (action: 'delete' | 'move') => {
    const courseCode = removeDialog.courseCode;
    if (!courseCode) return;

    setIsUpdatingGradPlan(true);
    setRemovePlanError(null);
    let didError = false;

    try {
      if (gradPlanId) {
        const endpoint = action === 'delete'
          ? '/api/grad-plan/remove-course-from-term'
          : '/api/grad-plan/move-course-to-next-term';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gradPlanId,
            termIndex,
            termName,
            courseCode,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          didError = true;
          setRemovePlanError(errorData?.error || 'Failed to update graduation plan');
        }
      }
    } catch (error) {
      console.error('Error updating grad plan:', error);
      didError = true;
      setRemovePlanError('Failed to update graduation plan');
    } finally {
      setIsUpdatingGradPlan(false);
      removeCourseFromSchedule(courseCode);
      if (!didError) {
        setRemoveDialog({ open: false, courseCode: null });
      }
    }
  };

  const handleRemoveFromScheduleOnly = () => {
    const courseCode = removeDialog.courseCode;
    if (!courseCode) return;
    removeCourseFromSchedule(courseCode);
    setRemovePlanError(null);
    setRemoveDialog({ open: false, courseCode: null });
  };

  const handleConfirmAddToGradPlan = async (addToGradPlan: boolean) => {
    const course = confirmDialog.course;
    if (!course) return;

    if (addToGradPlan && gradPlanId) {
      const courseCredits = course.credits_decimal || 3;
      const newTotalCredits = localTotalCredits + courseCredits;

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
            termName,
            course: {
              code: course.course_code,
              title: course.title,
              credits: courseCredits,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to add course to grad plan');
        }

        // Successfully added to grad plan
        addCourseToSchedule(course);
      } catch (error) {
        console.error('Error adding course to grad plan:', error);
        const message = error instanceof Error ? error.message : 'Failed to add course to graduation plan';
        alert(`${message}. The course will still be added to your schedule.`);
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

  const getCreditWarning = (credits: number) => {
    if (credits < 12) {
      return {
        severity: 'warning' as const,
        message: `You have ${credits} credits selected. Full-time status typically requires 12+ credits.`,
      };
    }
    if (credits > 18) {
      return {
        severity: 'warning' as const,
        message: `You have ${credits} credits selected. This exceeds the typical maximum of 18 credits.`,
      };
    }
    return null;
  };

  const courseIssueMap = new Map<string, { status: 'not_in_term' | 'not_found'; availableIn?: string }>();
  if (validationSummary) {
    validationSummary.notInTerm.forEach(item => {
      courseIssueMap.set(item.courseCode, { status: 'not_in_term', availableIn: item.availableIn });
    });
    validationSummary.notFound.forEach(item => {
      courseIssueMap.set(item.courseCode, { status: 'not_found' });
    });
  }
  const hasCourseIssues = courseIssueMap.size > 0;

  useEffect(() => {
    onCourseIssuesChange?.(hasCourseIssues);
  }, [hasCourseIssues, onCourseIssuesChange]);

  useEffect(() => {
    let isActive = true;

    const validateSelectedCourses = async () => {
      if (!termName || selectedCourses.length === 0) {
        setValidationSummary(null);
        setIsValidatingCourses(false);
        onValidationStatusChange?.({ isValidating: false, hasValidated: false });
        return;
      }

      setIsValidatingCourses(true);
      onValidationStatusChange?.({ isValidating: true, hasValidated: false });
      setValidationError(null);

      try {
        const response = await fetch('/api/test-scheduler-tools/get-course-offerings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universityId,
            termName,
            courseCodes: selectedCourses,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to validate courses');
        }

        const data = await response.json();
        if (!isActive) return;

        const notInTerm = (data?.results?.notInTerm || []).map((result: { courseCode: string; availableIn?: string }) => ({
          courseCode: result.courseCode,
          availableIn: result.availableIn,
        }));
        const notFound = (data?.results?.notFound || []).map((result: { courseCode: string }) => ({
          courseCode: result.courseCode,
        }));

        if (notInTerm.length === 0 && notFound.length === 0) {
          setValidationSummary(null);
        } else {
          setValidationSummary({ notInTerm, notFound });
        }
      } catch (err) {
        console.error('❌ [CourseConfirmationStep] Validation error:', err);
        if (isActive) {
          setValidationError(err instanceof Error ? err.message : 'Failed to validate courses');
          setValidationSummary(null);
        }
      } finally {
        if (isActive) {
          setIsValidatingCourses(false);
          onValidationStatusChange?.({ isValidating: false, hasValidated: true });
        }
      }
    };

    validateSelectedCourses();

    return () => {
      isActive = false;
    };
  }, [selectedCourses, termName, universityId, onValidationStatusChange]);

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

  const localTotalCredits = selectedCourseDetails.reduce((sum, course) => sum + course.credits, 0);
  const warning = getCreditWarning(localTotalCredits);
  const removeCourseDetails = removeDialog.courseCode
    ? allAvailableCourses.get(removeDialog.courseCode) || null
    : null;

  useEffect(() => {
    if (!onTotalCreditsChange) return;
    if (localTotalCredits === totalCredits) return;
    onTotalCreditsChange(localTotalCredits);
  }, [localTotalCredits, onTotalCreditsChange, totalCredits]);

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
          {localTotalCredits}
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

      {validationError && (
        <Alert severity="error">
          {validationError}
        </Alert>
      )}

      {isValidatingCourses && (
        <Alert severity="info">
          Validating course availability for {termName}...
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
              {selectedCourseDetails.map((course) => {
                const issue = courseIssueMap.get(course.code);
                return (
                  <TableRow key={course.code}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {issue && (
                        <Tooltip
                          title={
                            issue.status === 'not_in_term'
                              ? `Not available for term${termName ? ` (${termName})` : ''}${issue.availableIn ? ` • Offered ${issue.availableIn}` : ''}`
                              : 'Not available for term'
                          }
                          placement="top"
                          arrow
                        >
                          <Box component="span" sx={{ display: 'inline-flex' }}>
                            <AlertCircle size={16} color="#ef4444" />
                          </Box>
                        </Tooltip>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {course.code}
                      </Typography>
                    </Box>
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
                );
              })}
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
          disabled={selectedCourses.length === 0 || hasCourseIssues || isValidatingCourses}
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
            New Total: {localTotalCredits + (confirmDialog.course?.credits_decimal || 3)} / 18
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
              color: 'black',
              '&:hover': { bgcolor: 'var(--hover-green)' },
            }}
          >
            {isAddingToGradPlan ? 'Adding...' : 'Yes, Add to Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove / Move Dialog */}
      <Dialog
        open={removeDialog.open}
        onClose={() => {
          if (isUpdatingGradPlan) return;
          setRemovePlanError(null);
          setRemoveDialog({ open: false, courseCode: null });
        }}
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
              Update Graduation Plan?
            </Typography>
            <IconButton
              onClick={() => {
                if (isUpdatingGradPlan) return;
                setRemovePlanError(null);
                setRemoveDialog({ open: false, courseCode: null });
              }}
              size="small"
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You’re removing <strong>{removeDialog.courseCode}</strong>
            {removeCourseDetails?.title ? ` (${removeCourseDetails.title})` : ''} from this term.
            Do you want to update your graduation plan as well?
          </DialogContentText>
          {!gradPlanId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No active graduation plan was found. The course will be removed from this schedule only.
            </Alert>
          )}
          {removePlanError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {removePlanError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleRemoveFromScheduleOnly}
            disabled={isUpdatingGradPlan}
            sx={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
          >
            Remove From Schedule Only
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleConfirmRemoveFromPlan('move')}
            disabled={isUpdatingGradPlan || !gradPlanId}
            sx={{
              borderColor: '#06C96C',
              color: '#047857',
              fontWeight: 600,
            }}
          >
            Move To Next Term
          </Button>
          <Button
            variant="contained"
            onClick={() => handleConfirmRemoveFromPlan('delete')}
            disabled={isUpdatingGradPlan || !gradPlanId}
            sx={{
              bgcolor: '#ef4444',
              color: 'white',
              '&:hover': { bgcolor: '#dc2626' },
              fontWeight: 700,
            }}
          >
            Delete From Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
