"use client";

import React, { useState, useEffect } from 'react';
import { Upload, Save, Download, RefreshCw, Grid3x3, List, Edit2, X, ExternalLink, FileText, Info } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { StuLoader } from '@/components/ui/StuLoader';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';
import {
  fetchUserCourses,
  type ParsedCourse,
  type CourseFulfillment,
} from '@/lib/services/userCoursesService';
import {
  updateUserCoursesAction,
  updateCourseFulfillmentsAction,
  clearUserCoursesAction,
} from '@/lib/services/server-actions';
import { GetActiveGradPlan } from '@/lib/services/gradPlanService';
import { performGenEdMatching, extractRequirementOptions, type GenEdMatchResult, type RequirementOption } from '@/lib/services/courseMatchingService';
import { GenEdSelector } from '@/components/academic-history/GenEdSelector';
import { RequirementTag } from '@/components/academic-history/RequirementTag';
import { RequirementOverrideDialog } from '@/components/academic-history/RequirementOverrideDialog';
import { CircularProgress } from '@/components/academic-history/CircularProgress';
import { GetGenEdsForUniversity, fetchProgramsBatch } from '@/lib/services/programService';
import type { ProgramRow } from '@/types/program';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GradPlan {
  id: string;
  student_id: number;
  programs_in_plan: number[];
  plan_details: unknown;
  is_active: boolean;
  created_at: string;
}

function selectGenEdByEnrollmentDate(programs: ProgramRow[], enrollmentYear?: number | null): ProgramRow | null {
  if (!programs.length) {
    return null;
  }

  if (!enrollmentYear) {
    return programs
      .slice()
      .sort((a, b) => (b.applicable_start_year || 0) - (a.applicable_start_year || 0))[0] || null;
  }

  const matchingProgram = programs.find((program) => {
    const start = program.applicable_start_year ?? undefined;
    const end = program.applicable_end_year ?? undefined;

    if (start && end) {
      return enrollmentYear >= start && enrollmentYear <= end;
    }
    if (start && !end) {
      return enrollmentYear >= start;
    }
    if (!start && end) {
      return enrollmentYear <= end;
    }
    return false;
  });

  if (matchingProgram) {
    return matchingProgram;
  }

  return programs
    .slice()
    .sort((a, b) => (b.applicable_start_year || 0) - (a.applicable_start_year || 0))[0] || null;
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
  const [gpa, setGpa] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('full');
  const [editingCourse, setEditingCourse] = useState<ParsedCourse | null>(null);
  const [editForm, setEditForm] = useState({
    subject: '',
    number: '',
    title: '',
    credits: '',
    grade: '',
    term: '',
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [enrollmentYear, setEnrollmentYear] = useState<number | null>(null);
  const [isTransferStudent, setIsTransferStudent] = useState(false);
  const [genEdOptions, setGenEdOptions] = useState<ProgramRow[]>([]);
  const [genEdOptionsLoading, setGenEdOptionsLoading] = useState(false);
  const [selectedGenEds, setSelectedGenEds] = useState<ProgramRow[]>([]);
  const [requirementOptions, setRequirementOptions] = useState<RequirementOption[]>([]);
  const [genEdHasNoDoubleCount, setGenEdHasNoDoubleCount] = useState(false);
  const [, setMatchResults] = useState<GenEdMatchResult[]>([]);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [requirementDialogCourse, setRequirementDialogCourse] = useState<ParsedCourse | null>(null);
  const [_autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [gradPlanPrograms, setGradPlanPrograms] = useState<ProgramRow[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadingMessages = [
    'Loading your academic history...',
    'Organizing courses by semester...',
    'Preparing your transcript data...',
  ];

  // Fetch userId and university from session
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const id = sess.session?.user?.id || null;
      setUserId(id);

      if (!id) {
        setUniversityId(null);
        setEnrollmentYear(null);
        setIsTransferStudent(false);
        return;
      }

      try {
        const [{ data: profile }, { data: student }] = await Promise.all([
          supabase
            .from('profiles')
            .select('university_id')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('student')
            .select('admission_year,is_transfer')
            .eq('profile_id', id)
            .maybeSingle(),
        ]);

        setUniversityId(profile?.university_id ?? null);
        setEnrollmentYear(student?.admission_year ?? null);
        setIsTransferStudent(student?.is_transfer === 'transfer');
      } catch (error) {
        console.error('Failed to fetch profile metadata:', error);
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

  useEffect(() => {
    console.log('🎓 Gen Ed fetch effect triggered. University ID:', universityId, 'Enrollment Year:', enrollmentYear);

    if (!universityId) {
      console.log('⚠️ No university ID, clearing gen eds');
      setGenEdOptions([]);
      setSelectedGenEds([]);
      return;
    }

    let isMounted = true;
    setGenEdOptionsLoading(true);

    (async () => {
      try {
        console.log('📡 Fetching gen eds for university:', universityId);
        const programs = await GetGenEdsForUniversity(universityId);
        console.log('📚 Fetched', programs.length, 'gen ed programs:', programs);

        if (!isMounted) return;

        setGenEdOptions(programs);
        setSelectedGenEds((prev) => {
          if (prev.length > 0) {
            console.log('✅ Keeping existing selection:', prev.length, 'programs');
            return prev;
          }
          const autoSelected = selectGenEdByEnrollmentDate(programs, enrollmentYear);
          console.log('🎯 Auto-selected gen ed:', autoSelected ? autoSelected.name : 'none');
          return autoSelected ? [autoSelected] : [];
        });
      } catch (error) {
        console.error('❌ Failed to fetch general education programs:', error);
      } finally {
        if (isMounted) {
          setGenEdOptionsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [universityId, enrollmentYear]);

  // Extract requirement options from both gen eds and grad plan programs
  useEffect(() => {
    // Combine programs from both sources
    const allPrograms: ProgramRow[] = [];

    // Include grad plan programs if available
    if (activeGradPlan && gradPlanPrograms.length > 0) {
      allPrograms.push(...gradPlanPrograms);
    }

    // Also include selected gen eds (not else - include both!)
    if (selectedGenEds.length > 0) {
      allPrograms.push(...selectedGenEds);
    }

    if (allPrograms.length === 0) {
      setRequirementOptions([]);
      setGenEdHasNoDoubleCount(false);
      return;
    }

    setRequirementOptions(extractRequirementOptions(allPrograms));

    const hasRestriction = allPrograms.some((program) => {
      const requirements = program.requirements as { noDoubleCount?: boolean; metadata?: { noDoubleCount?: boolean } } | null;
      if (requirements && typeof requirements === 'object') {
        return Boolean(
          (requirements as { noDoubleCount?: boolean }).noDoubleCount ||
            (requirements as { metadata?: { noDoubleCount?: boolean } }).metadata?.noDoubleCount,
        );
      }
      return false;
    });

    setGenEdHasNoDoubleCount(hasRestriction);
  }, [selectedGenEds, gradPlanPrograms, activeGradPlan]);

  // Check for PDF URL in sessionStorage on initial load only
  useEffect(() => {
    // Check sessionStorage for the uploaded PDF (only available during current session before save)
    const storedPdfUrl = sessionStorage.getItem('transcript_pdf_url');
    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
    }
  }, []); // Run only once on mount

  // Rotate loading messages every 7 seconds when loading
  useEffect(() => {
    if (!userCoursesLoading) return;

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [userCoursesLoading, loadingMessages.length]);

  // Fetch GPA from student table
  useEffect(() => {
    if (!userId) {
      setGpa(null);
      return;
    }

    (async () => {
      try {
        const { data: studentData, error } = await supabase
          .from('student')
          .select('gpa')
          .eq('profile_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Failed to fetch student GPA:', error);
          setGpa(null);
        } else {
          setGpa(studentData?.gpa ?? null);
        }
      } catch (error) {
        console.error('Error fetching GPA:', error);
        setGpa(null);
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

  // Fetch programs from active grad plan
  useEffect(() => {
    if (!activeGradPlan || !activeGradPlan.programs_in_plan || activeGradPlan.programs_in_plan.length === 0) {
      setGradPlanPrograms([]);
      return;
    }

    (async () => {
      try {
        const programIds = activeGradPlan.programs_in_plan.map(String);
        const programs = await fetchProgramsBatch(programIds, universityId ?? undefined);
        setGradPlanPrograms(programs);
        console.log('✅ Fetched', programs.length, 'programs from active grad plan');
      } catch (error) {
        console.error('Failed to fetch programs from grad plan:', error);
        setGradPlanPrograms([]);
      }
    })();
  }, [activeGradPlan, universityId]);

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

  const clearAll = async () => {
    if (!userId) {
      setSnackbar({
        open: true,
        message: 'User not authenticated',
        severity: 'error',
      });
      return;
    }

    setIsClearing(true);

    try {
      const result = await clearUserCoursesAction(userId);

      if (result.success) {
        // Clear local state
        setUserCourses([]);
        setHasUserCourses(false);
        setActiveGradPlan(null);
        setPdfUrl(null);

        // Clear session storage as well
        sessionStorage.removeItem('transcript_pdf_url');

        setSnackbar({
          open: true,
          message: 'All courses cleared successfully',
          severity: 'success',
        });
        setShowClearConfirm(false);
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to clear courses',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error clearing courses:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while clearing courses',
        severity: 'error',
      });
    } finally {
      setIsClearing(false);
    }
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
        // Clear the PDF from sessionStorage after saving (FERPA compliance)
        sessionStorage.removeItem('transcript_pdf_url');
        setPdfUrl(null);

        setSnackbar({
          open: true,
          message: `Successfully saved ${result.courseCount} course${result.courseCount !== 1 ? 's' : ''}. Transcript PDF removed for privacy.`,
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

    // Get the PDF URL from sessionStorage after upload
    const storedPdfUrl = sessionStorage.getItem('transcript_pdf_url');
    if (storedPdfUrl) {
      setPdfUrl(storedPdfUrl);
    }

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
      message: 'Transcript parsed successfully! You can now view and verify your courses.',
      severity: 'success',
    });
  };

  // Automatically match courses when conditions change
  useEffect(() => {
    // Skip if no courses to match
    if (!userId || userCourses.length === 0) {
      return;
    }

    // Determine which programs to use for matching
    const programsToMatch: ProgramRow[] = [];

    // If user has an active grad plan, use those programs
    if (activeGradPlan && gradPlanPrograms.length > 0) {
      programsToMatch.push(...gradPlanPrograms);
      console.log('🎓 Matching against grad plan programs:', gradPlanPrograms.map(p => p.name).join(', '));
    } else if (selectedGenEds.length > 0) {
      // Otherwise, use selected gen eds (if any)
      programsToMatch.push(...selectedGenEds);
      console.log('📚 Matching against selected gen eds:', selectedGenEds.map(p => p.name).join(', '));
    }

    // Skip if no programs to match against
    if (programsToMatch.length === 0) {
      return;
    }

    // Run matching
    (async () => {
      try {
        setAutoMatchLoading(true);
        console.log('🚀 Auto-matching', userCourses.length, 'courses against', programsToMatch.length, 'programs');
        const results = performGenEdMatching(userCourses, programsToMatch);
        console.log('📊 Match results:', results);
        const updatedCourses = results.map((result) => result.course);

        const saveResult = await updateUserCoursesAction(userId, updatedCourses);
        if (!saveResult.success) {
          console.error('Failed to save matched courses:', saveResult.error);
          return;
        }

        setUserCourses(updatedCourses);
        setMatchResults(results);
        console.log('✅ Auto-match complete');
      } catch (error) {
        console.error('Failed to auto-match courses:', error);
      } finally {
        setAutoMatchLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedGenEds, gradPlanPrograms, activeGradPlan]);

  const handleRequirementDialogClose = () => {
    setOverrideDialogOpen(false);
    setRequirementDialogCourse(null);
  };

  const handleRequirementDialogOpen = (course: ParsedCourse) => {
    setRequirementDialogCourse(course);
    setOverrideDialogOpen(true);
  };

  const handleRequirementSave = async (courseId: string, fulfillments: CourseFulfillment[]) => {
    if (!userId) {
      setSnackbar({
        open: true,
        message: 'User not authenticated',
        severity: 'error',
      });
      return;
    }

    const result = await updateCourseFulfillmentsAction(userId, courseId, fulfillments);
    if (result.success && result.course) {
      setUserCourses((prev) => prev.map((course) => (course.id === courseId ? result.course! : course)));
      setSnackbar({
        open: true,
        message: 'Requirement assignment saved',
        severity: 'success',
      });
      handleRequirementDialogClose();
      return;
    }

    setSnackbar({
      open: true,
      message: result.error || 'Failed to update requirement assignment',
      severity: 'error',
    });
  };

  const matchedCourseCount = userCourses.filter((course) => (course.fulfillsRequirements?.length ?? 0) > 0).length;
  const matchStatus = {
    total: userCourses.length,
    matched: matchedCourseCount,
    unmatched: Math.max(userCourses.length - matchedCourseCount, 0),
  };

  // Get programs to display progress for
  const programsForProgress = activeGradPlan && gradPlanPrograms.length > 0
    ? gradPlanPrograms
    : selectedGenEds;

  // Calculate program progress
  const calculateProgramProgress = (programId: string) => {
    // Get all requirements for this program
    const programRequirements = requirementOptions.filter(
      (option) => option.programId === programId
    );
    const totalRequirements = programRequirements.length;

    if (totalRequirements === 0) {
      return { fulfilled: 0, total: 0, percentage: 0, completedCredits: 0, requiredCredits: 0 };
    }

    // Get the program to access its full requirements structure
    const program = programsForProgress.find(p => p.id === programId);
    if (!program) {
      return { fulfilled: 0, total: 0, percentage: 0, completedCredits: 0, requiredCredits: 0 };
    }

    // Parse the requirements structure
    interface RequirementStructure {
      programRequirements?: Array<{
        requirementId: number | string;
        type: string;
        constraints?: {
          n?: number;
          minTotalCredits?: number;
        };
      }>;
    }

    let requirementsStructure: RequirementStructure | null = null;

    try {
      if (typeof program.requirements === 'string') {
        requirementsStructure = JSON.parse(program.requirements) as RequirementStructure;
      } else if (program.requirements && typeof program.requirements === 'object') {
        requirementsStructure = program.requirements as RequirementStructure;
      }
    } catch (error) {
      console.error('Failed to parse program requirements:', error);
    }

    if (!requirementsStructure?.programRequirements) {
      // Fallback to simple counting if we can't parse requirements
      const fulfilledRequirementIds = new Set<string>();
      userCourses.forEach((course) => {
        course.fulfillsRequirements?.forEach((fulfillment) => {
          if (fulfillment.programId === programId) {
            fulfilledRequirementIds.add(fulfillment.requirementId);
          }
        });
      });

      const fulfilled = fulfilledRequirementIds.size;
      const percentage = (fulfilled / totalRequirements) * 100;

      return { fulfilled, total: totalRequirements, percentage, completedCredits: 0, requiredCredits: 0 };
    }

    // Calculate progress for each requirement based on its type
    let totalProgress = 0;
    let totalWeight = 0;

    requirementsStructure.programRequirements.forEach((requirement) => {
      const reqId = String(requirement.requirementId);
      const reqType = requirement.type;

      // Get courses that fulfill this requirement
      const fulfillingCourses = userCourses.filter((course) =>
        course.fulfillsRequirements?.some(
          (fulfillment) =>
            fulfillment.programId === programId &&
            fulfillment.requirementId.startsWith(reqId)
        )
      );

      let requirementProgress = 0;
      let requirementWeight = 1;

      if (reqType === 'chooseNOf' && requirement.constraints?.n) {
        // Progress = courses fulfilled / N required
        const n = requirement.constraints.n;
        requirementProgress = Math.min(fulfillingCourses.length / n, 1);
        requirementWeight = n; // Weight by number of courses required
      } else if (reqType === 'creditBucket' && requirement.constraints?.minTotalCredits) {
        // Progress = credits earned / credits required
        const creditsEarned = fulfillingCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
        const creditsRequired = requirement.constraints.minTotalCredits;
        requirementProgress = Math.min(creditsEarned / creditsRequired, 1);
        requirementWeight = creditsRequired; // Weight by credit hours required
      } else if (reqType === 'allOf') {
        // Progress = 1 if any courses fulfill it, 0 otherwise
        // (We don't know total course count without deeper parsing)
        requirementProgress = fulfillingCourses.length > 0 ? 1 : 0;
        requirementWeight = 1;
      } else {
        // Default: binary fulfilled/not fulfilled
        requirementProgress = fulfillingCourses.length > 0 ? 1 : 0;
        requirementWeight = 1;
      }

      totalProgress += requirementProgress * requirementWeight;
      totalWeight += requirementWeight;
    });

    const percentage = totalWeight > 0 ? (totalProgress / totalWeight) * 100 : 0;

    // Calculate total completed/required for display
    const completedCount = Math.round((totalProgress / totalWeight) * totalRequirements);
    const totalCount = totalRequirements;

    return {
      fulfilled: completedCount,
      total: totalCount,
      percentage,
      completedCredits: 0,
      requiredCredits: 0
    };
  };

  // Render a course card based on view mode
  const renderCourseCard = (course: ParsedCourse, bgColor: string, borderColor: string, editable = true) => {
    const isTransfer = course.origin === 'transfer' && course.transfer;

    if (viewMode === 'compact') {
      const hasFulfillments = (course.fulfillsRequirements?.length ?? 0) > 0;

      return (
        <div
          key={course.id}
          className="group relative"
          onMouseEnter={(e) => {
            const button = e.currentTarget.querySelector('button');
            const tooltip = e.currentTarget.querySelector('.course-tooltip') as HTMLElement;
            if (button && tooltip) {
              const rect = button.getBoundingClientRect();
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 8}px`;
            }
          }}
        >
          <button
            type="button"
            onClick={editable ? () => handleEditCourse(course) : undefined}
            disabled={!editable}
            className="relative rounded border px-2 py-1 shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-default"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
            }}
          >
            {hasFulfillments && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold text-white">
                {course.fulfillsRequirements!.length}
              </span>
            )}
            <span className="font-body-semi text-xs font-semibold text-zinc-900 dark:text-zinc-900">
              {course.subject} {course.number}
              {isTransfer && (
                <span className="ml-1 text-[10px] text-[var(--muted-foreground)]">↔</span>
              )}
            </span>
          </button>

          {/* Tooltip on hover - uses fixed positioning to be above everything */}
          <div className="course-tooltip pointer-events-none fixed z-[9999] hidden min-w-max -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-xl group-hover:block">
            <div className="space-y-0.5">
              <p className="font-body-semi text-xs font-semibold text-zinc-900 dark:text-zinc-900">{course.title}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span className="font-body">{course.credits} credits</span>
                <span>•</span>
                <span className="font-body">{course.grade || 'In Progress'}</span>
                {course.term && (
                  <>
                    <span>•</span>
                    <span className="font-body">{course.term}</span>
                  </>
                )}
              </div>
              {isTransfer && course.transfer && (
                <div className="mt-2 border-t border-[var(--border)] pt-2">
                  <p className="font-body-semi text-xs font-semibold text-[var(--muted-foreground)]">Transfer Credit</p>
                  <p className="font-body text-xs text-[var(--muted-foreground)]">
                    {course.transfer.originalSubject} {course.transfer.originalNumber} from {course.transfer.institution}
                  </p>
                </div>
              )}
              {course.fulfillsRequirements?.length ? (
                <div className="mt-2 border-t border-[var(--border)] pt-2">
                  <p className="font-body-semi text-xs font-semibold text-[var(--muted-foreground)]">Requirements</p>
                  {course.fulfillsRequirements.map((fulfillment) => (
                    <div
                      key={`${course.id}-${fulfillment.programId}-${fulfillment.requirementId}`}
                      className="font-body text-[11px] text-[var(--muted-foreground)]"
                    >
                      • {fulfillment.requirementDescription}{' '}
                      <span className="uppercase">
                        [{fulfillment.matchType === 'auto' ? 'Auto' : 'Manual'}]
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {editable && (
                <p className="font-body text-xs italic text-[var(--muted-foreground)]">Click to edit</p>
              )}
            </div>
            {/* Tooltip arrow */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--card)]" />
          </div>
        </div>
      );
    }

    // Full view mode
    return (
      <div
        key={course.id}
        className="relative flex flex-col rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {editable && (
          <button
            type="button"
            onClick={() => handleEditCourse(course)}
            className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Edit2 size={14} />
          </button>
        )}
        <div className="mb-2 flex items-start gap-2 pr-8">
          <h4 className="font-body-semi text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {course.subject} {course.number}
          </h4>
          {isTransfer && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              Transfer
            </span>
          )}
        </div>
        <p className="font-body mb-3 text-xs text-[var(--muted-foreground)] line-clamp-2">
          {course.title}
        </p>

        {/* Course Details */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="font-body rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium">
            {course.credits} cr
          </span>
          {course.grade && (
            <span className="font-body rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium">
              {course.grade}
            </span>
          )}
        </div>

        {/* Requirement Tags - More Prominent */}
        {course.fulfillsRequirements?.length ? (
          <div className="mb-2 flex flex-col gap-1.5 border-t border-[var(--border)] pt-2">
            <p className="font-body-semi text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
              Fulfills
            </p>
            <div className="flex flex-wrap gap-1">
              {course.fulfillsRequirements.map((fulfillment) => (
                <RequirementTag
                  key={`${course.id}-${fulfillment.programId}-${fulfillment.requirementId}`}
                  fulfillment={fulfillment}
                  onClick={
                    selectedGenEds.length > 0 || (activeGradPlan && gradPlanPrograms.length > 0)
                      ? () => handleRequirementDialogOpen(course)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Transfer Info */}
        {isTransfer && course.transfer && (
          <div className="mt-auto rounded-md border border-blue-200 bg-blue-50 p-2">
            <p className="font-body-semi text-xs font-semibold text-blue-900">Original Course</p>
            <p className="font-body text-xs text-blue-800">
              {course.transfer.originalSubject} {course.transfer.originalNumber} - {course.transfer.originalTitle}
            </p>
            <p className="font-body text-xs text-blue-700">
              From {course.transfer.institution}
            </p>
          </div>
        )}

        {/* Change Requirements Button */}
        {(selectedGenEds.length > 0 || (activeGradPlan && gradPlanPrograms.length > 0)) && (
          <button
            type="button"
            onClick={() => handleRequirementDialogOpen(course)}
            className="font-body mt-2 text-left text-xs font-semibold text-[var(--primary)] hover:text-[var(--hover-green)]"
          >
            {course.fulfillsRequirements?.length ? 'Change Requirements' : 'Assign Requirements'}
          </button>
        )}
      </div>
    );
  };

  // Show loading state
  if (userCoursesLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <StuLoader
          variant="page"
          text={loadingMessages[loadingMessageIndex]}
          speed={2.5}
        />
      </div>
    );
  }

  // Show fallback if no user courses
  if (!hasUserCourses) {
    return (
      <div className="flex h-full max-w-full flex-col p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-header-bold mb-2 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Academic History
          </h1>
          <div className="font-body space-y-2 text-sm text-[var(--muted-foreground)]">
            <p>Upload your transcript to get started:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Download your transcript from your university (print to PDF if needed)</li>
              <li>Upload the transcript PDF below</li>
            </ol>
          </div>
        </div>

        {/* BYU Transcript Download Button */}
        <a
          href="https://y.byu.edu/ry/ae/prod/records/cgi/stdCourseWork.cgi"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-body-semi text-sm font-semibold text-zinc-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
        >
          <ExternalLink size={16} />
          Download BYU Transcript
        </a>

        {/* Upload Area */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-2xl">
            <TranscriptUpload
              onTextExtracted={(text) => {
                console.log('Extracted text:', text);
              }}
              onParsingComplete={handleParsingComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main view when user has courses
  return (
    <div className="flex h-full max-w-full flex-col overflow-hidden p-4 sm:p-6">
      {/* Header Section */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-header-bold mb-2 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Academic History
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)]">
            Your courses organized by semester.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Transcript Button - only show if PDF exists */}
          {pdfUrl && (
            <button
              type="button"
              onClick={() => setShowPdfViewer(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
              title="View original transcript"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">View Transcript</span>
            </button>
          )}

          {/* View Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'compact' ? 'full' : 'compact')}
            className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            title={viewMode === 'compact' ? 'Switch to full view' : 'Switch to compact view'}
          >
            {viewMode === 'compact' ? <List size={16} /> : <Grid3x3 size={16} />}
            <span className="hidden sm:inline">{viewMode === 'compact' ? 'Full View' : 'Compact'}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={saveToDatabase}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-zinc-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
            title="Save courses to your profile"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            title="Upload transcript PDF"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={exportJson}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            title="Copy JSON to clipboard"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{copyStatus === 'copied' ? 'Copied!' : 'Export'}</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-400 hover:bg-red-50 hover:shadow-md"
            title="Clear all academic history"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      {Boolean(universityId && userCourses.length) && (
        <>
          {activeGradPlan && gradPlanPrograms.length > 0 ? (
            <div className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                  <span className="text-lg">🎓</span>
                </div>
                <div className="flex-1">
                  <p className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                    Active Graduation Plan
                  </p>
                  <p className="font-body text-xs text-[var(--muted-foreground)]">
                    Courses are automatically matched against: {gradPlanPrograms.map(p => p.name).join(', ')}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
                <div>
                  <p className="font-body-semi text-[var(--foreground)]">Total Courses</p>
                  <p className="font-body text-sm">{matchStatus.total}</p>
                </div>
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <p className="font-body-semi text-[var(--foreground)]">Matched</p>
                          <Info size={14} className="text-[var(--muted-foreground)]" />
                        </div>
                      </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Courses automatically matched to program requirements. Auto-matching is limited in scope, so some courses may be incorrectly attributed. Use &quot;Change Requirements&quot; to manually adjust if needed.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="font-body text-sm text-green-600">{matchStatus.matched}</p>
                </div>
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <p className="font-body-semi text-[var(--foreground)]">Unmatched</p>
                          <Info size={14} className="text-[var(--muted-foreground)]" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Courses not matched to any program requirement. These may be electives or courses not applicable to your selected programs. Use &quot;Change Requirements&quot; to manually assign if needed.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="font-body text-sm text-red-600">{matchStatus.unmatched}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 w-full">
              <GenEdSelector
                programs={genEdOptions}
                selectedPrograms={selectedGenEds}
                onSelectionChange={setSelectedGenEds}
                matchStatus={matchStatus}
                enrollmentYear={enrollmentYear}
                isTransfer={isTransferStudent}
                loading={genEdOptionsLoading}
              />
            </div>
          )}
        </>
      )}
      <div className="flex flex-1 flex-col gap-6 overflow-auto">
        {/* Group courses by term/semester */}
        {(() => {
          // Helper function to parse and sort terms chronologically
          const parseTermForSorting = (termString: string): { year: number; semester: number; raw: string } => {
            // Extract year (4-digit number)
            const yearMatch = termString.match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;

            // Determine semester order: Winter=1, Spring=2, Summer=3, Fall=4
            let semester = 0;
            const lowerTerm = termString.toLowerCase();
            if (lowerTerm.includes('winter')) semester = 1;
            else if (lowerTerm.includes('spring')) semester = 2;
            else if (lowerTerm.includes('summer')) semester = 3;
            else if (lowerTerm.includes('fall')) semester = 4;

            return { year, semester, raw: termString };
          };

          // Group courses by term
          const coursesByTerm = userCourses.reduce((acc, course) => {
            const term = course.term || 'Unknown Term';
            if (!acc[term]) {
              acc[term] = [];
            }
            acc[term].push(course);
            return acc;
          }, {} as Record<string, ParsedCourse[]>);

          // Sort terms chronologically (newest first)
          const sortedTerms = Object.keys(coursesByTerm).sort((a, b) => {
            const parsedA = parseTermForSorting(a);
            const parsedB = parseTermForSorting(b);

            // Sort by year descending (newest first)
            if (parsedA.year !== parsedB.year) {
              return parsedB.year - parsedA.year;
            }

            // If same year, sort by semester descending (Fall -> Summer -> Spring -> Winter)
            return parsedB.semester - parsedA.semester;
          });

          // Calculate total credits
          const totalCredits = userCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
          const totalCourses = userCourses.length;

          // Determine grid columns based on total semesters (only for compact view)
          const getGridCols = (count: number): string => {
            if (viewMode === 'full') {
              return 'flex flex-col'; // Full view: display as rows
            }
            // Compact view: display as grid columns
            if (count >= 7) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'; // 4 per row
            if (count >= 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // 3 per row
            if (count >= 3) return 'grid-cols-1 md:grid-cols-2'; // 2 per row
            return 'grid-cols-1'; // 1 per row
          };

          return (
            <>
              {/* Summary Card */}
              <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
                <div className="border-b-2 bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-header text-lg font-bold text-zinc-100 dark:text-zinc-900">
                        Academic Summary
                      </h3>
                      <p className="font-body text-xs text-zinc-300 dark:text-zinc-700">
                        Total: {totalCredits.toFixed(1)} credits • {totalCourses} courses • {gpa !== null ? `${gpa.toFixed(2)} GPA` : 'GPA: N/A'}
                      </p>
                    </div>
                    <span className="rounded-lg bg-[var(--primary)] px-3 py-1.5 font-body-semi text-xs font-semibold text-zinc-900">
                      {sortedTerms.length} semester{sortedTerms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Program Progress Section */}
                {programsForProgress.length > 0 && (
                  <div className="border-t border-[var(--border)] px-6 py-4">
                    <h4 className="font-body-semi mb-4 text-sm font-semibold text-[var(--foreground)]">
                      Requirement Progress
                    </h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {programsForProgress.map((program) => {
                        const progress = calculateProgramProgress(program.id);
                        return (
                          <div key={program.id} className="flex flex-col items-center">
                            <CircularProgress
                              percentage={progress.percentage}
                              size={70}
                              strokeWidth={6}
                              label={program.name}
                            />
                            <p className="font-body mt-2 text-center text-xs text-[var(--muted-foreground)]">
                              {progress.fulfilled} / {progress.total} requirements
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Term Containers */}
              <div className={viewMode === 'compact' ? `grid ${getGridCols(sortedTerms.length)} gap-6` : 'flex flex-col gap-6'}>
                {sortedTerms.map((term) => {
                  const termCourses = coursesByTerm[term];
                  const termCredits = termCourses.reduce((sum, course) => sum + (course.credits || 0), 0);

                  return (
                    <div key={term} className={`rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md ${viewMode === 'full' ? 'overflow-hidden' : 'overflow-visible'}`}>
                      {/* Header */}
                      <div className="border-b bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-header text-sm font-bold text-zinc-100 dark:text-zinc-900">
                            {term}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-xs text-zinc-400 dark:text-zinc-600">
                              {termCredits.toFixed(1)} cr
                            </p>
                            <span className="rounded bg-[var(--primary)] px-1.5 py-0.5 font-body-semi text-xs font-semibold text-zinc-900">
                              {termCourses.length} course{termCourses.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Courses Grid/Flex */}
                      <div className="p-3 overflow-visible">
                        <div className={viewMode === 'compact' ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'}>
                          {termCourses.map((course) =>
                            renderCourseCard(course, 'rgba(18, 249, 135, 0.1)', 'var(--primary)')
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      {requirementDialogCourse && (
        <RequirementOverrideDialog
          open={overrideDialogOpen}
          course={requirementDialogCourse}
          availableRequirements={requirementOptions}
          genEdHasNoDoubleCount={genEdHasNoDoubleCount}
          onClose={handleRequirementDialogClose}
          onSave={handleRequirementSave}
        />
      )}

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <button
              type="button"
              onClick={() => setUploadDialogOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X size={20} />
            </button>
            <div className="p-6">
              <TranscriptUpload
                onTextExtracted={(text) => {
                  console.log('Extracted text:', text);
                }}
                onParsingComplete={handleParsingComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Dialog */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-header text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Course</h2>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="e.g., CS, MATH"
                  />
                  <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">e.g., CS, MATH, REL A</p>
                </div>
                <div>
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Number
                  </label>
                  <input
                    type="text"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="e.g., 142"
                  />
                  <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">e.g., 142, 112, 275</p>
                </div>
              </div>

              <div>
                <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Course title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Credits
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                    className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="3.0"
                  />
                </div>
                <div>
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                    className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    placeholder="A, B+, C-"
                  />
                </div>
              </div>

              <div>
                <label className="font-body-semi mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Term
                </label>
                <input
                  type="text"
                  value={editForm.term}
                  onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                  className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="e.g., Fall Semester 2023"
                />
                <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">e.g., Fall Semester 2023</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-zinc-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4">
          <div className="relative flex h-[90vh] w-full max-w-7xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-[var(--primary)]" />
                <h2 className="font-header text-xl font-bold text-zinc-900 dark:text-zinc-100">Original Transcript</h2>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)]"
                >
                  <ExternalLink size={16} />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfViewer(false)}
                  className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-hidden p-4">
              <iframe
                src={pdfUrl}
                className="h-full w-full rounded-lg border border-[var(--border)]"
                title="Transcript PDF"
              />
            </div>

            {/* Footer with helpful info */}
            <div className="border-t border-[var(--border)] bg-amber-50 px-6 py-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-200">
                  <span className="text-xs font-bold text-amber-900">i</span>
                </div>
                <div className="space-y-1">
                  <p className="font-body-semi text-xs font-semibold text-amber-900">
                    Temporary Transcript View
                  </p>
                  <p className="font-body text-xs text-amber-800">
                    Compare the PDF with your parsed courses above. Click on any course to edit if you find discrepancies.
                    <strong className="font-semibold"> This PDF will be automatically removed when you click &ldquo;Save&rdquo; to comply with FERPA privacy regulations.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-header text-xl font-bold text-red-600">Clear All Courses?</h2>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-body-semi text-sm font-semibold text-red-900 mb-2">
                  ⚠️ Warning: This action cannot be undone
                </p>
                <p className="font-body text-sm text-red-800">
                  This will permanently delete all {userCourses.length} course{userCourses.length !== 1 ? 's' : ''} from your academic history.
                  You will need to re-upload your transcript to restore this data.
                </p>
              </div>

              <p className="font-body text-sm text-[var(--muted-foreground)]">
                Are you sure you want to continue?
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-body-semi text-sm font-medium text-[var(--foreground)] transition-all duration-200 hover:bg-[var(--muted)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isClearing}
                className="rounded-lg bg-red-600 px-4 py-2 font-body-semi text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isClearing ? 'Clearing...' : 'Clear All Courses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar Notification */}
      {snackbar.open && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4">
          <div
            className={`flex min-w-[300px] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              snackbar.severity === 'success'
                ? 'border-green-200 bg-green-50 text-green-900'
                : snackbar.severity === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-blue-200 bg-blue-50 text-blue-900'
            }`}
          >
            <p className="font-body-semi flex-1 text-sm font-medium">{snackbar.message}</p>
            <button
              type="button"
              onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              className="rounded-md p-1 transition-colors hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
