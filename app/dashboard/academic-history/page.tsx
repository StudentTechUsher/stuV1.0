"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  IconButton,
  Stack,
} from '@mui/material';
import { Save, FileCopy, Refresh, Upload, ViewModule, ViewList, Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';
import {
  fetchUserCourses,
  type ParsedCourse,
} from '@/lib/services/userCoursesService';
import { updateUserCoursesAction } from '@/lib/services/server-actions';
import { GetActiveGradPlan } from '@/lib/services/gradPlanService';
import { fetchProgramsBatch, GetGenEdsForUniversity } from '@/lib/services/programService';
import type { ProgramRow } from '@/types/program';
import {
  matchCoursesToPrograms,
  matchCoursesToProgram,
  type ProgramWithMatches,
} from '@/lib/services/courseMatchingService';

interface GradPlan {
  id: string;
  student_id: number;
  programs_in_plan: number[];
  plan_details: unknown;
  is_active: boolean;
  created_at: string;
}

export default function AcademicHistoryPage() {
  const supabase = createSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [hasUserCourses, setHasUserCourses] = useState<boolean | null>(null);
  const [userCoursesLoading, setUserCoursesLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [userCourses, setUserCourses] = useState<ParsedCourse[]>([]);
  const [activeGradPlan, setActiveGradPlan] = useState<GradPlan | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [genEdProgram, setGenEdProgram] = useState<ProgramRow | null>(null);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [programMatches, setProgramMatches] = useState<ProgramWithMatches[]>([]);
  const [genEdMatches, setGenEdMatches] = useState<ProgramWithMatches | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');
  const [editingCourse, setEditingCourse] = useState<ParsedCourse | null>(null);
  const [editForm, setEditForm] = useState({
    subject: '',
    number: '',
    title: '',
    credits: '',
    grade: '',
    term: '',
  });

  // Helper function to calculate total required credits or courses from program requirements
  const calculateProgramTotals = (program: ProgramRow): { total: number; unit: 'credits' | 'courses' } => {
    if (!program.requirements) return { total: 0, unit: 'credits' };

    try {
      const req = typeof program.requirements === 'string'
        ? JSON.parse(program.requirements)
        : program.requirements;

      // For Gen Ed programs, requirements is an array of RichRequirement
      if (Array.isArray(req)) {
        let totalCredits = 0;
        let totalCourses = 0;
        let hasCredits = false;

        req.forEach((item: {
          requirement?: { rule?: { type?: string; min_count?: number; unit?: string } };
          blocks?: Array<{ credits?: { fixed?: number } }>
        }) => {
          const rule = item.requirement?.rule;
          if (rule?.type === 'min_count') {
            const minCount = rule.min_count || 1;
            const unit = rule.unit || 'courses';

            if (unit === 'credits') {
              hasCredits = true;
              // Try to get credits from blocks
              if (item.blocks && Array.isArray(item.blocks)) {
                item.blocks.forEach((block: { credits?: { fixed?: number } }) => {
                  if (block.credits?.fixed) {
                    totalCredits += block.credits.fixed;
                  }
                });
              }
            } else {
              totalCourses += minCount;
            }
          }
        });

        // If we found any credit-based requirements, use credits. Otherwise use courses
        if (hasCredits && totalCredits > 0) {
          return { total: totalCredits, unit: 'credits' };
        }
        return { total: totalCourses, unit: 'courses' };
      }

      // For regular programs, check metadata first
      if (req && typeof req === 'object' && 'metadata' in req) {
        const metadata = (req as { metadata?: { totalMinCredits?: number } }).metadata;
        if (metadata?.totalMinCredits) {
          return { total: metadata.totalMinCredits, unit: 'credits' };
        }
      }

      // Check programRequirements array
      if (req && typeof req === 'object' && 'programRequirements' in req) {
        const programReqs = (req as { programRequirements?: Array<{
          type?: string;
          description?: string;
          courses?: Array<{ credits?: number }>;
          constraints?: { minTotalCredits?: number; n?: number };
        }> }).programRequirements;

        if (Array.isArray(programReqs)) {
          let totalCredits = 0;
          let totalCourses = 0;
          let useCreditBased = false;

          programReqs.forEach((requirement) => {
            if (requirement.type === 'creditBucket' && requirement.constraints?.minTotalCredits) {
              useCreditBased = true;
              totalCredits += requirement.constraints.minTotalCredits;
            } else if (requirement.type === 'allOf' && Array.isArray(requirement.courses)) {
              totalCourses += requirement.courses.length;
            } else if (requirement.type === 'chooseNOf' && requirement.constraints?.n) {
              totalCourses += requirement.constraints.n;
            } else if (requirement.description) {
              // Fallback: parse description
              const creditMatch = /Complete (\d+) credits?/i.exec(requirement.description);
              if (creditMatch) {
                useCreditBased = true;
                totalCredits += parseInt(creditMatch[1], 10);
              } else {
                const courseMatch = /Complete (\d+)(?:\s+(?:of\s+\d+\s+)?(?:courses?|classes?))?/i.exec(requirement.description);
                if (courseMatch) {
                  totalCourses += parseInt(courseMatch[1], 10);
                }
              }
            }
          });

          if (useCreditBased && totalCredits > 0) {
            return { total: totalCredits, unit: 'credits' };
          }
          if (totalCourses > 0) {
            return { total: totalCourses, unit: 'courses' };
          }
        }
      }

      return { total: 0, unit: 'credits' };
    } catch (error) {
      console.error('Error parsing requirements for totals:', error);
      return { total: 0, unit: 'credits' };
    }
  };

  // Fetch userId and university from session
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const id = sess.session?.user?.id || null;
      setUserId(id);

      if (id) {
        // Fetch user's university from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', id)
          .single();

        if (profile?.university_id) {
          setUniversityId(profile.university_id);
        }
      }
    })();
  }, [supabase]);

  // Check if user has courses in user_courses table
  useEffect(() => {
    if (!userId) {
      setUserCoursesLoading(false);
      setHasUserCourses(false);
      return;
    }

    (async () => {
      try {
        setUserCoursesLoading(true);
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
        setUserCoursesLoading(false);
      }
    })();
  }, [userId, supabase]);

  // Fetch active grad plan if user has courses
  useEffect(() => {
    if (!userId || !hasUserCourses) {
      setActiveGradPlan(null);
      return;
    }

    (async () => {
      try {
        const gradPlan = await GetActiveGradPlan(userId);
        setActiveGradPlan(gradPlan as GradPlan | null);

        if (!gradPlan) {
          setSnackbar({
            open: true,
            message: 'No active graduation plan found. Create one to see course mappings.',
            severity: 'info',
          });
        }
      } catch (error) {
        console.error('Failed to fetch active grad plan:', error);
        setActiveGradPlan(null);
      }
    })();
  }, [userId, hasUserCourses]);

  // Fetch Gen Ed program when university is available (independent of grad plan)
  useEffect(() => {
    if (!universityId) {
      setGenEdProgram(null);
      return;
    }

    (async () => {
      try {
        const genEds = await GetGenEdsForUniversity(universityId);
        if (genEds.length > 0) {
          setGenEdProgram(genEds[0]);
          console.log('✅ Loaded Gen Ed program:', genEds[0].name);
        } else {
          setGenEdProgram(null);
          console.log('⚠️ No Gen Ed program found for university:', universityId);
        }
      } catch (error) {
        console.error('Failed to fetch Gen Ed program:', error);
        setGenEdProgram(null);
      }
    })();
  }, [universityId]);

  // Fetch programs when grad plan is available
  useEffect(() => {
    if (!activeGradPlan || !universityId) {
      setPrograms([]);
      return;
    }

    (async () => {
      try {
        // Extract program IDs from grad plan
        const programIds = activeGradPlan.programs_in_plan || [];

        if (programIds.length > 0) {
          // Fetch program details
          const programsData = await fetchProgramsBatch(
            programIds.map(String),
            universityId
          );
          setPrograms(programsData);
          console.log('✅ Loaded programs:', programsData.map(p => p.name).join(', '));
        } else {
          setPrograms([]);
        }
      } catch (error) {
        console.error('Failed to fetch programs:', error);
        setPrograms([]);
      }
    })();
  }, [activeGradPlan, universityId]);

  // Match courses to programs when both are available
  useEffect(() => {
    if (userCourses.length === 0 || (programs.length === 0 && !genEdProgram)) {
      setProgramMatches([]);
      setGenEdMatches(null);
      return;
    }

    // Match courses to regular programs
    if (programs.length > 0) {
      const matches = matchCoursesToPrograms(userCourses, programs);
      setProgramMatches(matches);
    }

    // Match courses to Gen Ed program with subject-only matching enabled
    if (genEdProgram) {
      const genEdMatch = matchCoursesToProgram(userCourses, genEdProgram, { allowSubjectMatch: true });
      setGenEdMatches(genEdMatch);
    }
  }, [userCourses, programs, genEdProgram]);

  const exportJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            userCourses,
            activeGradPlan,
          },
          null,
          2
        )
      );
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  const clearAll = () => {
    if (!confirm('Clear all academic history entries? This cannot be undone.')) return;
    // TODO: Implement clear functionality
    setSnackbar({
      open: true,
      message: 'Clear functionality will be implemented',
      severity: 'info',
    });
  };

  const saveToDatabase = async () => {
    if (!userId) {
      setSnackbar({
        open: true,
        message: 'User not authenticated',
        severity: 'error',
      });
      return;
    }

    try {
      const result = await updateUserCoursesAction(userId, userCourses);

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully saved ${result.courseCount} course${result.courseCount !== 1 ? 's' : ''}`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to save courses',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving courses:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while saving courses',
        severity: 'error',
      });
    }
  };

  const handleEditCourse = (course: ParsedCourse) => {
    setEditingCourse(course);
    setEditForm({
      subject: course.subject,
      number: course.number,
      title: course.title,
      credits: String(course.credits || ''),
      grade: course.grade || '',
      term: course.term || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingCourse) return;

    const updatedCourses: ParsedCourse[] = userCourses.map((course) =>
      course.id === editingCourse.id
        ? {
            ...course,
            subject: editForm.subject.trim(),
            number: editForm.number.trim(),
            title: editForm.title.trim(),
            credits: editForm.credits ? parseFloat(editForm.credits) : null,
            grade: editForm.grade.trim() || null,
            term: editForm.term.trim() || '',
          }
        : course
    );

    setUserCourses(updatedCourses);
    setEditingCourse(null);
    setSnackbar({
      open: true,
      message: 'Course updated successfully! Remember to save your changes.',
      severity: 'success',
    });
  };

  const handleParsingComplete = async () => {
    setUploadDialogOpen(false);
    // Reload user courses after transcript upload
    if (userId) {
      try {
        const coursesRecord = await fetchUserCourses(supabase, userId);
        if (coursesRecord && coursesRecord.courses) {
          setHasUserCourses(true);
          setUserCourses(coursesRecord.courses);
        }
      } catch (error) {
        console.error('Failed to reload user courses:', error);
      }
    }
    setSnackbar({
      open: true,
      message: 'Transcript parsed successfully!',
      severity: 'success',
    });
  };

  // Render a course card based on view mode
  const renderCourseCard = (course: ParsedCourse, bgColor: string, borderColor: string, editable = true) => {
    if (viewMode === 'compact') {
      return (
        <Tooltip
          key={course.id}
          title={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{course.title}</Typography>
              <Typography variant="caption">{course.credits} credits • {course.grade || 'In Progress'}</Typography>
              {course.term && <Typography variant="caption" sx={{ display: 'block' }}>{course.term}</Typography>}
              {editable && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>Click to edit</Typography>}
            </Box>
          }
          arrow
        >
          <Paper
            elevation={1}
            onClick={editable ? () => handleEditCourse(course) : undefined}
            sx={{
              px: 1.5,
              py: 1,
              backgroundColor: bgColor,
              border: '1px solid',
              borderColor: borderColor,
              cursor: editable ? 'pointer' : 'default',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: editable ? 'scale(1.05)' : 'none',
                elevation: editable ? 2 : 1,
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {course.subject} {course.number}
            </Typography>
          </Paper>
        </Tooltip>
      );
    }

    // Full view mode
    return (
      <Paper
        key={course.id}
        elevation={1}
        sx={{
          p: 1.5,
          minWidth: 250,
          flex: '1 1 calc(33.333% - 12px)',
          backgroundColor: bgColor,
          border: '1px solid',
          borderColor: borderColor,
          position: 'relative',
        }}
      >
        {editable && (
          <IconButton
            size="small"
            onClick={() => handleEditCourse(course)}
            sx={{ position: 'absolute', top: 4, right: 4 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {course.subject} {course.number}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
          {course.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          <Chip label={`${course.credits} credits`} size="small" variant="outlined" />
          {course.grade && <Chip label={course.grade} size="small" variant="outlined" />}
          {course.term && <Chip label={course.term} size="small" variant="outlined" />}
        </Box>
      </Paper>
    );
  };

  // Show loading state
  if (userCoursesLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading academic history...
        </Typography>
      </Box>
    );
  }

  // Show fallback if no user courses
  if (!hasUserCourses) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Academic History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload your transcript to get started.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ maxWidth: 600, width: '100%' }}>
            <TranscriptUpload
              onTextExtracted={(text) => {
                console.log('Extracted text:', text);
              }}
              onParsingComplete={handleParsingComplete}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Main view when user has courses
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Academic History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your courses organized by program requirements.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Tooltip title={viewMode === 'compact' ? 'Switch to full view' : 'Switch to compact view'}>
            <Button
              variant="outlined"
              size="small"
              startIcon={viewMode === 'compact' ? <ViewList /> : <ViewModule />}
              onClick={() => setViewMode(viewMode === 'compact' ? 'full' : 'compact')}
            >
              {viewMode === 'compact' ? 'Full View' : 'Compact'}
            </Button>
          </Tooltip>
          <Tooltip title="Save courses to your profile">
            <Button variant="contained" size="small" startIcon={<Save />} onClick={saveToDatabase}>
              Save
            </Button>
          </Tooltip>
          <Tooltip title="Upload transcript PDF">
            <Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => setUploadDialogOpen(true)}>
              Upload
            </Button>
          </Tooltip>
          <Tooltip title="Copy JSON to clipboard">
            <Button variant="outlined" size="small" startIcon={<FileCopy />} onClick={exportJson}>
              {copyStatus === 'copied' ? 'Copied!' : 'Export'}
            </Button>
          </Tooltip>
          <Tooltip title="Clear all entries (local)">
            <Button variant="outlined" size="small" color="error" startIcon={<Refresh />} onClick={clearAll}>
              Clear
            </Button>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Warning when no grad plan */}
        {!activeGradPlan && (
          <Paper sx={{ p: 3, backgroundColor: 'warning.light' }}>
            <Typography variant="body1" color="warning.dark">
              No active graduation plan found. Create one to see how your courses map to program requirements.
            </Typography>
          </Paper>
        )}

        {/* Gen Ed Program Container - Always show if we have matches */}
        {genEdMatches && genEdMatches.matchedCourses.length > 0 && genEdProgram && (() => {
          const { total: totalRequired, unit } = calculateProgramTotals(genEdProgram);
          const earned = unit === 'credits'
            ? genEdMatches.matchedCourses.reduce((sum, course) => sum + (course.credits || 0), 0)
            : genEdMatches.matchedCourses.length;
          const percentage = totalRequired > 0 ? Math.min((earned / totalRequired) * 100, 100) : 0;

          return (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={percentage}
                      size={60}
                      thickness={4}
                      sx={{ color: 'success.main' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                        {Math.round(percentage)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      General Education
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {earned} of {totalRequired} {unit}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={`${genEdMatches.matchedCourses.length} course${genEdMatches.matchedCourses.length !== 1 ? 's' : ''}`}
                  color="success"
                  size="small"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: viewMode === 'compact' ? 0.75 : 1.5 }}>
                {genEdMatches.matchedCourses.map((course) =>
                  renderCourseCard(course, 'success.light', 'success.main')
                )}
              </Box>
            </Paper>
          );
        })()}

        {/* Program Containers - Only show if grad plan exists */}
        {activeGradPlan && programMatches.map((programMatch) => {
          const { total: totalRequired, unit } = calculateProgramTotals(programMatch.program);
          const earned = unit === 'credits'
            ? programMatch.matchedCourses.reduce((sum, course) => sum + (course.credits || 0), 0)
            : programMatch.matchedCourses.length;
          const percentage = totalRequired > 0 ? Math.min((earned / totalRequired) * 100, 100) : 0;

          return (
            <Paper key={programMatch.program.id} elevation={2} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={percentage}
                      size={60}
                      thickness={4}
                      sx={{ color: 'primary.main' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                        {Math.round(percentage)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {programMatch.program.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {programMatch.program.program_type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {earned} of {totalRequired} {unit}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  label={`${programMatch.matchedCourses.length} course${programMatch.matchedCourses.length !== 1 ? 's' : ''}`}
                  color="primary"
                  size="small"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {programMatch.matchedCourses.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: viewMode === 'compact' ? 0.75 : 1.5 }}>
                  {programMatch.matchedCourses.map((course) =>
                    renderCourseCard(course, 'primary.light', 'primary.main')
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No courses matched to this program yet.
                </Typography>
              )}
            </Paper>
          );
        })}

        {/* Display unmatched courses - Always show if there are any */}
        {(() => {
          const allMatchedIds = new Set(
            [...programMatches, ...(genEdMatches ? [genEdMatches] : [])]
              .flatMap((pm) => pm.matchedCourses.map((c) => c.id))
          );
          const unmatchedCourses = userCourses.filter((c) => !allMatchedIds.has(c.id));

          return unmatchedCourses.length > 0 ? (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  No Category Assigned
                </Typography>
                <Chip
                  label={`${unmatchedCourses.length} course${unmatchedCourses.length !== 1 ? 's' : ''}`}
                  color="default"
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These courses did not match any program requirements. They may be electives or courses from other programs.
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: viewMode === 'compact' ? 0.75 : 1.5 }}>
                {unmatchedCourses.map((course) =>
                  renderCourseCard(course, 'grey.100', 'grey.400')
                )}
              </Box>
            </Paper>
          ) : null;
        })()}
      </Box>

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 3 }}>
          <TranscriptUpload
            onTextExtracted={(text) => {
              console.log('Extracted text:', text);
            }}
            onParsingComplete={handleParsingComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCourse} onClose={() => setEditingCourse(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit Course</Typography>
            <IconButton onClick={() => setEditingCourse(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                fullWidth
                size="small"
                helperText="e.g., CS, MATH, REL A"
              />
              <TextField
                label="Number"
                value={editForm.number}
                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                fullWidth
                size="small"
                helperText="e.g., 142, 112, 275"
              />
            </Box>
            <TextField
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              fullWidth
              size="small"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Credits"
                value={editForm.credits}
                onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                type="number"
                fullWidth
                size="small"
                inputProps={{ step: 0.5 }}
              />
              <TextField
                label="Grade"
                value={editForm.grade}
                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                fullWidth
                size="small"
                helperText="e.g., A, B+, C-"
              />
            </Box>
            <TextField
              label="Term"
              value={editForm.term}
              onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
              fullWidth
              size="small"
              helperText="e.g., Fall Semester 2023"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setEditingCourse(null)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
