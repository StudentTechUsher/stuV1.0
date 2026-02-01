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
} from '@mui/material';
import { Trash2 } from 'lucide-react';

interface CourseConfirmationStepProps {
  termIndex: number;
  gradPlanCourses: { code: string; title: string; credits: number }[];
  selectedCourses: string[];
  onCoursesChange: (courses: string[]) => void;
  totalCredits: number;
  onNext: () => void;
  onBack: () => void;
}

export default function CourseConfirmationStep({
  gradPlanCourses,
  selectedCourses,
  onCoursesChange,
  totalCredits,
  onNext,
  onBack,
}: CourseConfirmationStepProps) {
  const [_newCourse] = useState('');

  const handleRemoveCourse = (courseCode: string) => {
    onCoursesChange(selectedCourses.filter(c => c !== courseCode));
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

  // Find course details for selected courses
  const selectedCourseDetails = gradPlanCourses.filter(course =>
    selectedCourses.includes(course.code)
  );

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
    </Box>
  );
}
