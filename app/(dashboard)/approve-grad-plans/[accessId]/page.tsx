'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert, TextField, IconButton } from '@mui/material';
import { CheckCircle, Save } from '@mui/icons-material';
import { Add, Remove } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StuLoader } from '@/components/ui/StuLoader';
import { fetchGradPlanById, approveGradPlan, decodeAccessIdServerAction, updateGradPlanDetailsAndAdvisorNotesAction, fetchProfileBasicInfoAction } from '@/lib/services/server-actions';
import { createNotifForGradPlanEdited, createNotifForGradPlanApproved } from '@/lib/services/notifService';
import { sendGradPlanApprovalEmail } from '@/lib/services/emailService';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Course, Term } from '@/components/grad-planner/types';
import { AdvisorProgressPanel, calculateCategoryProgress } from '@/components/grad-planner/AdvisorProgressPanel';
import mockExpandableCategories from '@/components/grad-planner/mockExpandableData';

interface GradPlanDetails {
  id: string;
  student_first_name: string;
  student_last_name: string;
  created_at: string;
  plan_details: unknown;
  student_id: number;
  programs: Array<{ id: number; name: string }>;
}

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

type CourseLike = Partial<Course> & { name?: string };

type TermLike = {
  term?: string;
  courses?: CourseLike[];
  [key: string]: unknown;
};

const isTermArray = (value: unknown): value is Term[] => {
  return Array.isArray(value) && value.every(item => {
    if (typeof item !== 'object' || item === null) return false;
    const termValue = (item as { term?: unknown }).term;
    return typeof termValue === 'string';
  });
};

const extractTermsFromPlanDetails = (details: unknown): Term[] => {
  if (isTermArray(details)) {
    return details;
  }

  if (typeof details === 'object' && details !== null) {
    const candidate = details as Record<string, unknown>;
    for (const key of ['plan', 'semesters', 'terms'] as const) {
      const maybeTerms = candidate[key];
      if (isTermArray(maybeTerms)) {
        return maybeTerms;
      }
    }
  }

  return [];
};

export default function ApproveGradPlanPage() {
  const router = useRouter();
  const params = useParams();
  const [gradPlan, setGradPlan] = React.useState<GradPlanDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSuggestions, setHasSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editablePlan, setEditablePlan] = React.useState<Term[] | null>(null); // normalized array of terms
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const supabase = createSupabaseBrowserClient();

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Suggestions state helpers (advisor-only UI on this page)
  const recomputeHasSuggestions = React.useCallback((next: Record<string, string>) => {
    const has = Object.values(next).some(v => (v ?? '').toString().trim() !== '');
    setHasSuggestions(has);
  }, []);

  const addSuggestion = React.useCallback((termKey: string) => {
    setSuggestions(prev => {
      const next = { ...prev, [termKey]: prev[termKey] ?? '' };
      recomputeHasSuggestions(next);
      return next;
    });
  }, [recomputeHasSuggestions]);

  const removeSuggestion = React.useCallback((termKey: string) => {
    setSuggestions(prev => {
      const next = { ...prev };
      delete next[termKey];
      recomputeHasSuggestions(next);
      return next;
    });
  }, [recomputeHasSuggestions]);

  const updateSuggestion = React.useCallback((termKey: string, value: string) => {
    setSuggestions(prev => {
      const next = { ...prev, [termKey]: value };
      recomputeHasSuggestions(next);
      return next;
    });
  }, [recomputeHasSuggestions]);

  const formatSuggestionsForAdvisorNotes = (suggestions: Record<string, string>): string => {
    const entries = Object.entries(suggestions).filter(([, value]) => value.trim() !== '');
    if (entries.length === 0) return '';
    
    return entries
      .map(([termKey, suggestion]) => {
        // Convert termKey to readable format (e.g., "term-1" -> "Term 1", "2" -> "Term 2")
        const termLabel = termKey.startsWith('term-') 
          ? `Term ${termKey.replace('term-', '')}`
          : `Term ${termKey}`;
        return `${termLabel}: ${suggestion.trim()}`;
      })
      .join('\n');
  };

  // Check if user is an advisor before allowing access
  React.useEffect(() => {
    async function checkUserRole() {
      try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          console.error('Error getting session:', sessionError);
          router.push('/home');
          return;
        }

        // Fetch the user's profile to get their role_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          router.push('/home');
          return;
        }

        // Check if user is an advisor (role_id = 2)
        const role: Role = ROLE_MAP[profile?.role_id ?? "3"];
        
        if (role !== "advisor") {
          router.push('/home');
          return;
        }

        // User is an advisor, allow access
        setIsCheckingRole(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        router.push('/home');
      }
    }

    checkUserRole();
  }, [router, supabase]);

  React.useEffect(() => {
    // Don't fetch data until role check is complete
    if (isCheckingRole) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Decode the access ID to get the grad plan ID
        const accessId = params.accessId as string;
        const decodeResult = await decodeAccessIdServerAction(accessId);

        if (!decodeResult.success || !decodeResult.gradPlanId) {
          throw new Error(decodeResult.error || 'Invalid or expired access link');
        }

        // Fetch the detailed grad plan data using gradPlanId
        const planData = await fetchGradPlanById(decodeResult.gradPlanId);
        
        if (!active) return;
        
        if (!planData) {
          throw new Error('Graduation plan not found or no longer pending approval');
        }

        setGradPlan(planData);
        const terms = extractTermsFromPlanDetails(planData.plan_details);
        const clonedTerms = terms.map((term) => ({
          ...term,
          courses: term.courses?.map(course => ({ ...course })),
        }));
        setEditablePlan(clonedTerms);

      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Failed to load graduation plan');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [params.accessId, isCheckingRole]);

  const handleBack = () => {
    router.push('/approve-grad-plans');
  };

  // Helper to detect moved courses between original and edited plans
  const detectMovedCourses = (originalTerms: TermLike[], editedTerms: TermLike[]) => {
    const movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }> = [];

    // Build a map of course locations in original plan
    const originalCourseMap = new Map<string, number>();
    originalTerms.forEach((term, termIdx) => {
      const courses = Array.isArray(term.courses) ? term.courses : [];
      courses.forEach((course) => {
        const code = typeof course.code === 'string' && course.code.trim() !== '' ? course.code.trim() : undefined;
        const title = typeof course.title === 'string' && course.title.trim() !== '' ? course.title.trim() : undefined;
        const name = typeof course.name === 'string' && course.name.trim() !== '' ? course.name.trim() : undefined;
        const key = code ?? title ?? name ?? JSON.stringify(course);
        originalCourseMap.set(key, termIdx + 1); // 1-indexed term numbers
      });
    });

    // Check each course in edited plan
    editedTerms.forEach((term, termIdx) => {
      const courses = Array.isArray(term.courses) ? term.courses : [];
      courses.forEach((course) => {
        const code = typeof course.code === 'string' && course.code.trim() !== '' ? course.code.trim() : undefined;
        const title = typeof course.title === 'string' && course.title.trim() !== '' ? course.title.trim() : undefined;
        const name = typeof course.name === 'string' && course.name.trim() !== '' ? course.name.trim() : undefined;
        const key = code ?? title ?? name ?? JSON.stringify(course);
        const originalTermNum = originalCourseMap.get(key);
        const currentTermNum = termIdx + 1;

        if (originalTermNum && originalTermNum !== currentTermNum) {
          movedCourses.push({
            courseName: title ?? name ?? code ?? 'Unknown Course',
            courseCode: code ?? '',
            fromTerm: originalTermNum,
            toTerm: currentTermNum
          });
        }
      });
    });

    return movedCourses;
  };

  const normalizeTermsForComparison = (terms: Term[]): TermLike[] => {
    return terms.map((term) => ({
      ...term,
      courses: Array.isArray(term.courses)
        ? term.courses.map((course): CourseLike => ({ ...course }))
        : []
    }));
  };

  const isObjectLike = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const buildUpdatedPlanPayload = (originalDetails: unknown, updatedTerms: Term[]): unknown => {
    if (Array.isArray(originalDetails)) {
      return updatedTerms;
    }

    if (isObjectLike(originalDetails)) {
      if (Array.isArray(originalDetails.plan)) {
        return { ...originalDetails, plan: updatedTerms };
      }

      if (Array.isArray(originalDetails.semesters)) {
        return { ...originalDetails, semesters: updatedTerms };
      }

      if (Array.isArray(originalDetails.terms)) {
        return { ...originalDetails, terms: updatedTerms };
      }

      return { ...originalDetails, plan: updatedTerms };
    }

    return { plan: updatedTerms };
  };

  const handleSave = async () => {
    if (!gradPlan || !editablePlan) return;
    setIsSaving(true);
    try {
      const originalDetails = gradPlan.plan_details;

      // Extract original terms for comparison
      const originalTerms = extractTermsFromPlanDetails(originalDetails);

      // Detect moved courses
      const movedCourses = detectMovedCourses(
        normalizeTermsForComparison(originalTerms),
        normalizeTermsForComparison(editablePlan)
      );

      const payload = buildUpdatedPlanPayload(originalDetails, editablePlan);
      const advisorNotes = formatSuggestionsForAdvisorNotes(suggestions);
      const result = await updateGradPlanDetailsAndAdvisorNotesAction(gradPlan.id, payload, advisorNotes);
      if (result.success) {
        showSnackbar('Changes & suggestions saved. Redirecting...', 'success');
        setUnsavedChanges(false);
        if (hasSuggestions) {
          setHasSuggestions(false);
        }
        // Fire a notification to the student that their plan was edited.
        try {
          // Get advisor (current user) id
          const { data: { session } } = await supabase.auth.getSession();
          const advisorUserId = session?.user?.id || null;
          const accessId = params.accessId as string;
          // Look up student.profile_id from numeric student_id in grad plan
          let targetUserId: string | null = null;
          if (gradPlan.student_id) {
            const { data: studentRow, error: studentErr } = await supabase
              .from('student')
              .select('profile_id')
              .eq('id', gradPlan.student_id)
              .maybeSingle();
            if (studentErr) {
              console.warn('⚠️ Could not fetch student row for notification:', studentErr.message);
            } else if (studentRow?.profile_id) {
              targetUserId = studentRow.profile_id;
            }
          }
          if (targetUserId) {
            void createNotifForGradPlanEdited(targetUserId, advisorUserId, accessId, {
              movedCourses,
              hasSuggestions
            });
          } else {
            console.warn('⚠️ Could not resolve target_user_id (profile_id) from student_id for notification.');
          }
        } catch (notifyErr) {
          console.error('Notification dispatch failed (non-blocking):', notifyErr);
        }
        // Redirect to approval list after short delay so user sees snackbar
        setTimeout(() => router.push('/approve-grad-plans'), 1100);
      } else {
        showSnackbar(result.error || 'Failed to save changes', 'error');
      }
    } catch (e) {
      console.error('Save error', e);
      showSnackbar('Unexpected error while saving plan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  const handleApprove = async () => {
    if (!gradPlan) return;
    if (unsavedChanges) {
      showSnackbar('Please save changes before approving.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await approveGradPlan(gradPlan.id);
      if (result.success) {
        showSnackbar('Graduation plan approved successfully! The student can now view their active plan.', 'success');
        // Fire notification to student about approval (non-blocking)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const advisorUserId = session?.user?.id || null;
          let targetUserId: string | null = null;
          if (gradPlan.student_id) {
            const { data: studentRow, error: studentErr } = await supabase
              .from('student')
              .select('profile_id')
              .eq('id', gradPlan.student_id)
              .maybeSingle();
            if (studentErr) {
              console.warn('⚠️ Could not fetch student row for approval notification:', studentErr.message);
            } else if (studentRow?.profile_id) {
              targetUserId = studentRow.profile_id;
            }
          }
            if (targetUserId) {
              void createNotifForGradPlanApproved(targetUserId, advisorUserId);
            } else {
              console.warn('⚠️ Could not resolve target_user_id for approval notification.');
            }

          // Send approval email to student
          if (targetUserId) {
            const studentProfile = await fetchProfileBasicInfoAction(targetUserId);
            const advisorProfile = advisorUserId ? await fetchProfileBasicInfoAction(advisorUserId) : null;

            if (studentProfile && studentProfile.email) {
              const accessId = params.accessId as string;
              await sendGradPlanApprovalEmail({
                studentFirstName: studentProfile.fname || 'Student',
                studentEmail: studentProfile.email,
                planAccessId: accessId,
                advisorName: advisorProfile ? `${advisorProfile.fname} ${advisorProfile.lname}` : undefined,
              });
            }
          }
        } catch (notifyErr) {
          console.error('Approval notification dispatch failed (non-blocking):', notifyErr);
        }
        setTimeout(() => router.push('/approve-grad-plans'), 2000);
      } else {
        showSnackbar(`Failed to approve plan: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error approving graduation plan:', error);
      showSnackbar('An unexpected error occurred while approving the plan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getApproveButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (hasSuggestions) return 'Cannot Approve (Unsaved Suggestions)';
    return 'Approve Plan';
  };

  // Calculate category progress for the progress panel
  const categoryProgress = React.useMemo(() => {
    if (!editablePlan) return [];
    return calculateCategoryProgress(editablePlan);
  }, [editablePlan]);

  // Calculate total credits for progress panel
  const totalCreditsData = React.useMemo(() => {
    if (!editablePlan) return { earned: 0, required: 133.66 };

    const earned = editablePlan.reduce((total, term) => {
      const termCredits = term.credits_planned ||
                         (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
      return total + termCredits;
    }, 0);

    return { earned, required: 133.66 }; // You can make 'required' dynamic based on program requirements
  }, [editablePlan]);

  // Calculate current semester credits (assuming first term is current)
  const currentSemesterCredits = React.useMemo(() => {
    if (!editablePlan || editablePlan.length === 0) return 0;
    const currentTerm = editablePlan[0];
    return currentTerm.credits_planned ||
           (currentTerm.courses ? currentTerm.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
  }, [editablePlan]);

  // Calculate total planned credits in the grad plan
  const plannedCredits = React.useMemo(() => {
    if (!editablePlan) return 0;
    return editablePlan.reduce((total, term) => {
      const termCredits = term.credits_planned ||
                         (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
      return total + termCredits;
    }, 0);
  }, [editablePlan]);

  if (isCheckingRole || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <StuLoader
          variant="page"
          text={isCheckingRole ? 'Checking permissions...' : 'Loading graduation plan for review...'}
        />
      </div>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Approval List
        </Button>
        <Alert severity="error">
          {error}
        </Alert>
      </Box>
    );
  }

  if (!gradPlan) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Approval List
        </Button>
        <Alert severity="warning">
          Graduation plan not found
        </Alert>
      </Box>
    );
  }

  const studentName = `${gradPlan.student_first_name} ${gradPlan.student_last_name}`;
  const submittedDisplay = new Date(gradPlan.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        maxWidth: '1600px',
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <Box
        component="section"
        sx={{
          borderRadius: '7px',
          border: '1px solid',
          borderColor: 'color-mix(in srgb, rgba(10,31,26,0.16) 35%, var(--border) 65%)',
          backgroundColor: '#ffffff',
          boxShadow: '0 56px 120px -90px rgba(10,31,26,0.55)',
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          variant="text"
          onClick={handleBack}
          sx={{
            alignSelf: 'flex-start',
            px: 0,
            color: '#0a1f1a',
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: '0.04em',
            '&:hover': {
              backgroundColor: 'transparent',
              color: 'var(--hover-green)',
            },
          }}
        >
          Back to Approval List
        </Button>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', lg: 'center' },
            gap: { xs: 3, lg: 4 },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontFamily: '"Red Hat Display", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.75rem', md: '2.1rem' },
                color: '#0a1f1a',
              }}
            >
              Review Graduation Plan
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2.5,
                  py: 1,
                  borderRadius: '7px',
                  backgroundColor: '#0a1f1a',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Submitted {submittedDisplay}
              </Box>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2.5,
                  py: 1,
                  borderRadius: '7px',
                  backgroundColor: 'color-mix(in srgb, var(--primary) 16%, white 84%)',
                  color: 'color-mix(in srgb, var(--foreground) 80%, var(--primary) 20%)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {studentName}
              </Box>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!unsavedChanges || isSaving}
            sx={{
              backgroundColor: '#0a1f1a',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              letterSpacing: '0.06em',
              px: 3,
              py: 1.25,
              borderRadius: '7px',
              '&:hover': {
                backgroundColor: '#043322',
              },
              '&:disabled': {
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)',
              },
            }}
          >
            {(() => {
              if (isSaving) return 'Saving…';
              if (unsavedChanges) return 'Save Changes & Notify Student';
              return 'Saved';
            })()}
          </Button>
        </Box>
      </Box>

      {/* Main content area with grad plan and progress panel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: isPanelCollapsed ? '1fr auto' : '1fr 380px' },
          gap: 4,
          alignItems: 'start',
        }}
      >
        {/* Left column - Graduation Planner */}
        <Box
          sx={{
            borderRadius: '7px',
            border: '1px solid',
            borderColor: 'color-mix(in srgb, rgba(10,31,26,0.16) 30%, var(--border) 70%)',
            backgroundColor: '#ffffff',
            boxShadow: '0 48px 120px -80px rgba(10,31,26,0.45)',
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <GraduationPlanner
            plan={editablePlan ?? (gradPlan.plan_details as Record<string, unknown> | Term[] | undefined)}
            isEditMode
            initialSpaceView
            editorRole="advisor"
            onPlanUpdate={(updated) => {
              setEditablePlan(updated);
              setUnsavedChanges(true);
            }}
          />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: '"Red Hat Display", sans-serif',
              fontWeight: 700,
              color: '#0a1f1a',
              letterSpacing: '0.04em',
            }}
          >
            Advisor Suggestions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add optional notes for specific terms. Saved suggestions notify the student automatically.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {(editablePlan || []).map((term, idx) => {
              const termKey = `term-${idx + 1}`;
              const has = Object.prototype.hasOwnProperty.call(suggestions, termKey);
              return (
                <Box
                  key={termKey}
                  sx={{
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: has
                      ? 'color-mix(in srgb, var(--primary) 38%, transparent)'
                      : 'color-mix(in srgb, rgba(10,31,26,0.12) 40%, transparent)',
                    backgroundColor: has
                      ? 'color-mix(in srgb, var(--primary) 10%, white)'
                      : '#ffffff',
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: '#0a1f1a', letterSpacing: '0.06em' }}
                    >
                      Term {term?.term || idx + 1}
                    </Typography>
                    {has ? (
                      <IconButton size="small" onClick={() => removeSuggestion(termKey)} sx={{ color: 'var(--action-cancel)' }}>
                        <Remove fontSize="small" />
                      </IconButton>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => addSuggestion(termKey)}
                        sx={{
                          borderRadius: '7px',
                          borderColor: '#0a1f1a',
                          color: '#0a1f1a',
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#043322',
                            backgroundColor: 'rgba(10,31,26,0.06)',
                          },
                        }}
                      >
                        Suggest Edit
                      </Button>
                    )}
                  </Box>
                  {has && (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Share guidance for this term..."
                      value={suggestions[termKey] || ''}
                      onChange={(e) => updateSuggestion(termKey, e.target.value)}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

          <Alert severity={unsavedChanges ? 'warning' : 'info'} sx={{ borderRadius: '7px' }}>
            {unsavedChanges
              ? 'You have unsaved changes. Saving your edits or suggestions does not approve the plan.'
              : 'Move courses or add per-term suggestions. Saving sends updates to the student without approving the plan.'}
          </Alert>
        </Box>

        {/* Right column - Progress Panel (hidden on mobile) */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <AdvisorProgressPanel
            studentName={studentName}
            totalCredits={totalCreditsData}
            categories={categoryProgress}
            planData={editablePlan ?? []}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
            currentSemesterCredits={currentSemesterCredits}
            plannedCredits={plannedCredits}
            expandableCategories={mockExpandableCategories}
          />
        </Box>
      </Box>

      {hasSuggestions && (
        <Alert severity="info" sx={{ borderRadius: '7px' }}>
          You have unsaved suggestions. Save them before approving this plan.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          startIcon={<CheckCircle />}
          onClick={handleApprove}
          disabled={hasSuggestions || isProcessing || unsavedChanges}
          sx={{
            backgroundColor: 'var(--primary)',
            color: '#0a1f1a',
            fontWeight: 700,
            textTransform: 'none',
            letterSpacing: '0.08em',
            px: 4,
            py: 1.5,
            borderRadius: '7px',
            boxShadow: (hasSuggestions || isProcessing || unsavedChanges)
              ? 'none'
              : '0 22px 46px -28px rgba(18,249,135,0.55)',
            '&:hover': {
              backgroundColor: 'var(--hover-green)',
            },
            '&:disabled': {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            },
          }}
        >
          {getApproveButtonText()}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
