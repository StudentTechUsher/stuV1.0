"use client";

import React, { useState, useEffect } from 'react';
import { Upload, Save, Download, RefreshCw, Grid3x3, List, Edit2, X, ExternalLink, FileText } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { StuLoader } from '@/components/ui/StuLoader';
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    'Loading your academic history...',
    'Organizing courses by semester...',
    'Preparing your transcript data...',
  ];

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
        } else {
          setGenEdProgram(null);
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

  // Render a course card based on view mode
  const renderCourseCard = (course: ParsedCourse, bgColor: string, borderColor: string, editable = true) => {
    if (viewMode === 'compact') {
      return (
        <div key={course.id} className="group relative">
          <button
            type="button"
            onClick={editable ? () => handleEditCourse(course) : undefined}
            disabled={!editable}
            className="rounded border px-2 py-1 shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-default"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
            }}
          >
            <span className="font-body-semi text-xs font-semibold text-[var(--foreground)]">
              {course.subject} {course.number}
            </span>
          </button>

          {/* Tooltip on hover - auto-width to fit content */}
          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden min-w-max -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg group-hover:block">
            <div className="space-y-0.5">
              <p className="font-body-semi text-xs font-semibold text-[var(--foreground)]">{course.title}</p>
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
        className="relative min-w-[250px] flex-1 rounded-lg border p-4 shadow-sm"
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
        <h4 className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
          {course.subject} {course.number}
        </h4>
        <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">
          {course.title}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="font-body rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium">
            {course.credits} credits
          </span>
          {course.grade && (
            <span className="font-body rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium">
              {course.grade}
            </span>
          )}
          {course.term && (
            <span className="font-body rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium">
              {course.term}
            </span>
          )}
        </div>
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
          <h1 className="font-header-bold mb-2 text-3xl font-extrabold text-[var(--foreground)]">
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
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-body-semi text-sm font-semibold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
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
          <h1 className="font-header-bold mb-2 text-3xl font-extrabold text-[var(--foreground)]">
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
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
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
            onClick={clearAll}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-[var(--card)] px-3 py-2 font-body-semi text-sm font-medium text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-400 hover:bg-red-50 hover:shadow-md"
            title="Clear all entries (local)"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
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

          // Determine grid columns based on total semesters
          const getGridCols = (count: number): string => {
            if (count >= 7) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'; // 4 per row
            if (count >= 5) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // 3 per row
            if (count >= 3) return 'grid-cols-1 md:grid-cols-2'; // 2 per row
            return 'grid-cols-1'; // 1 per row
          };

          return (
            <>
              {/* Summary Card */}
              <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm">
                <div className="border-b-2 px-6 py-4" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-header text-lg font-bold text-white">
                        Academic Summary
                      </h3>
                      <p className="font-body text-xs text-white/70">
                        Total: {totalCredits.toFixed(1)} credits • {totalCourses} courses
                      </p>
                    </div>
                    <span className="rounded-lg bg-[var(--primary)] px-3 py-1.5 font-body-semi text-xs font-semibold text-black">
                      {sortedTerms.length} semester{sortedTerms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Term Containers Grid */}
              <div className={`grid ${getGridCols(sortedTerms.length)} gap-6`}>
                {sortedTerms.map((term) => {
                  const termCourses = coursesByTerm[term];
                  const termCredits = termCourses.reduce((sum, course) => sum + (course.credits || 0), 0);

                  return (
                    <div key={term} className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
                      {/* Header */}
                      <div className="border-b px-4 py-2.5" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-header text-sm font-bold text-white">
                            {term}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-xs text-white/60">
                              {termCredits.toFixed(1)} cr
                            </p>
                            <span className="rounded bg-[var(--primary)] px-1.5 py-0.5 font-body-semi text-xs font-semibold text-black">
                              {termCourses.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Courses Grid */}
                      <div className="p-3">
                        <div className={`flex flex-wrap gap-${viewMode === 'compact' ? '1.5' : '2'}`}>
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

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-header text-xl font-bold text-[var(--foreground)]">Edit Course</h2>
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
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                  <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                <label className="font-body-semi mb-1.5 block text-sm font-medium text-[var(--foreground)]">
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
                className="rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative flex h-[90vh] w-full max-w-7xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-[var(--primary)]" />
                <h2 className="font-header text-xl font-bold text-[var(--foreground)]">Original Transcript</h2>
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
