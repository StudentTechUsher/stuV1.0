'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchGradPlanForEditing, updateStudentGradPlanAction, decodeAccessIdServerAction, setGradPlanActiveAction } from '@/lib/services/server-actions';
import { recalculatePlanCompletion } from '@/lib/services/gradPlanService';
import { StuLoader } from '@/components/ui/StuLoader';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import AdvisorNotesBox from '@/components/grad-planner/AdvisorNotesBox';
import { Event, Term } from '@/components/grad-planner/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { clientLogger } from '@/lib/client-logger';
import { ProgressOverviewContainer } from '@/components/progress-overview/ProgressOverviewContainer';
import { buildPlanProgress } from '@/components/progress-overview/planProgressAdapter';
import EditablePlanTitle from '@/components/EditablePlanTitle';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ProgramRow } from '@/types/program';

interface GradPlanDetails {
  id: string;
  student_first_name: string;
  student_last_name: string;
  created_at: string;
  plan_details: unknown;
  student_id: number;
  programs: Array<{ id: number; name: string }>;
  est_grad_sem?: string;
  est_grad_date?: string;
  advisor_notes: string | null;
  plan_name: string | null;
  is_active: boolean;
}

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
};

const isTermArray = (value: unknown): value is Term[] => {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const termValue = (item as { term?: unknown }).term;
    return typeof termValue === 'string';
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Helper to check if an item is an Event (vs a Term)
const isEvent = (item: unknown): item is Event => {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.type === 'string' && typeof candidate.afterTerm === 'number';
};

// Helper to merge events into plan array at correct positions
const mergePlanWithEvents = (terms: Term[], events: Event[]): Array<Term | Event> => {
  const result: Array<Term | Event> = [];

  for (let i = 0; i < terms.length; i++) {
    result.push(terms[i]);

    // Add events that come after this term
    const eventsAfterThisTerm = events.filter(e => e.afterTerm === i + 1);
    result.push(...eventsAfterThisTerm);
  }

  return result;
};

// Helper to extract terms and events from merged plan array
const extractTermsAndEvents = (planArray: unknown[]): { terms: Term[]; events: Event[] } => {
  const terms: Term[] = [];
  const events: Event[] = [];

  for (const item of planArray) {
    if (isEvent(item)) {
      events.push(item);
    } else if (typeof item === 'object' && item !== null && 'term' in item) {
      terms.push(item as Term);
    }
  }

  return { terms, events };
};

const extractPlanArray = (details: unknown): Term[] | null => {
  let rawDetails: unknown = details;

  if (typeof rawDetails === 'string') {
    try {
      rawDetails = JSON.parse(rawDetails);
    } catch {
      rawDetails = null;
    }
  }

  if (isTermArray(rawDetails)) {
    return rawDetails;
  }

  if (isRecord(rawDetails)) {
    const candidate = rawDetails;
    const candidateKeys: Array<keyof typeof candidate> = ['plan', 'semesters', 'terms'];
    for (const key of candidateKeys) {
      if (Array.isArray(candidate[key])) {
        // Extract just the terms from the array (filter out events)
        const { terms } = extractTermsAndEvents(candidate[key] as unknown[]);
        if (terms.length > 0) {
          return terms;
        }
      }
    }
    const nested = candidate.plan_details;
    if (isRecord(nested) && Array.isArray(nested.plan)) {
      const { terms } = extractTermsAndEvents(nested.plan as unknown[]);
      if (terms.length > 0) {
        return terms;
      }
    }
  }

  return null;
};

const normalizePlanDetails = (
  details: unknown,
  options: { est_grad_sem?: string; est_grad_date?: string } = {}
): Record<string, unknown> => {
  let normalized: unknown = details;

  if (typeof normalized === 'string') {
    try {
      normalized = JSON.parse(normalized);
    } catch {
      normalized = {};
    }
  }

  if (Array.isArray(normalized)) {
    normalized = { plan: normalized };
  }

  if (isRecord(normalized)) {
    const result = { ...normalized };
    if (Array.isArray(result.plan)) {
      // already in expected shape
    } else if (Array.isArray(result.semesters)) {
      result.plan = result.semesters;
    } else if (Array.isArray(result.terms)) {
      result.plan = result.terms;
    } else if (isRecord(result.plan_details) && Array.isArray(result.plan_details.plan)) {
      result.plan = result.plan_details.plan;
    } else if (!result.plan) {
      result.plan = [];
    }
    if (options.est_grad_sem) result.est_grad_sem = options.est_grad_sem;
    if (options.est_grad_date) result.est_grad_date = options.est_grad_date;
    return result;
  }

  return {
    plan: [],
    ...options,
  };
};

export default function EditGradPlanPage() {
  const router = useRouter();
  const params = useParams();
  const [gradPlan, setGradPlan] = React.useState<GradPlanDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPlanData, setCurrentPlanData] = React.useState<Term[] | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = React.useState(true);
  const [userRole, setUserRole] = React.useState<Role | null>(null);
  const [advisorChanges, setAdvisorChanges] = React.useState<{
    movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }>;
    hasSuggestions: boolean;
  } | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [showJsonDebug, setShowJsonDebug] = React.useState(false);
  const [isActivePlan, setIsActivePlan] = React.useState(false);
  const [showActivePlanConfirm, setShowActivePlanConfirm] = React.useState(false);
  const [isSettingActive, setIsSettingActive] = React.useState(false);
  const [programsData, setProgramsData] = React.useState<ProgramRow[]>([]);
  const [genEdProgram, setGenEdProgram] = React.useState<ProgramRow | null>(null);
  const [universityId, setUniversityId] = React.useState<number | null>(null);

  const isEditMode = true; // Always in edit mode for this page
  const isDev = process.env.NEXT_PUBLIC_ENV === 'development' || process.env.NODE_ENV === 'development';

  // Debug: Log when events state changes
  React.useEffect(() => {
    console.log('📊 Parent events state updated:', events);
  }, [events]);

  // Extract advisor changes from localStorage (if coming from notification)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('advisorChanges');
      if (stored) {
        const data = JSON.parse(stored);
        setAdvisorChanges(data);
        // Clear after reading so it doesn't persist on future visits
        localStorage.removeItem('advisorChanges');
      }
    } catch (e) {
      clientLogger.error('Error reading advisor changes from localStorage', e, { action: 'EditGradPlanPage.useEffect' });
    }
  }, []);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [requestAdvisorReview, setRequestAdvisorReview] = React.useState(false);

  const supabase = createSupabaseBrowserClient();
  const progressData = React.useMemo(() => {
    return buildPlanProgress({
      terms: currentPlanData ?? [],
      programs: programsData,
      genEdProgram,
    });
  }, [currentPlanData, programsData, genEdProgram]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handlePlanUpdate = (updatedPlan: Term[]) => {
    setCurrentPlanData(updatedPlan);
  };

  const handleSave = (updatedPlan: Term[], planEvents: Event[]) => {
    setCurrentPlanData(updatedPlan);
    setEvents(planEvents);
    const eventCount = planEvents.length;
    const eventMessage = eventCount > 0
      ? `Plan saved! ${eventCount} event${eventCount === 1 ? '' : 's'} tracked.`
      : 'Plan saved!';
    showSnackbar(eventMessage, 'success');
  };

  // Callback to receive the event dialog opener from GraduationPlanner (not used in UI, but passed to component)
  const handleRegisterEventDialogOpener = React.useCallback((_opener: (event?: Event) => void) => {
    // Event dialog functionality removed from sidebar, but kept for internal component use
  }, []);

  // Check if user has access to this graduation plan
  React.useEffect(() => {
    async function checkUserAccess() {
      try {
        // Get the current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          clientLogger.error('Error getting session', sessionError, { action: 'EditGradPlanPage.checkUserAccess' });
          router.push('/home');
          return;
        }

        // Fetch the user's profile to get their role_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role_id, university_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          clientLogger.error('Error fetching user profile', profileError, { action: 'EditGradPlanPage.checkUserAccess', userId: session.user.id });
          router.push('/home');
          return;
        }

        // Get user role
        const role: Role = ROLE_MAP[profile?.role_id ?? "3"];
        setUserRole(role);
        if (profile?.university_id) {
          setUniversityId(typeof profile.university_id === 'number'
            ? profile.university_id
            : Number(profile.university_id));
        }

        // Decode the access ID to get the grad plan ID
        const accessId = params.accessId as string;
        const decodeResult = await decodeAccessIdServerAction(accessId);

        if (!decodeResult.success || !decodeResult.gradPlanId) {
          throw new Error(decodeResult.error || 'Invalid or expired access link');
        }

        // Fetch the detailed grad plan data using gradPlanId
        const planData = await fetchGradPlanForEditing(decodeResult.gradPlanId);

        if (!planData) {
          throw new Error('Graduation plan not found');
        }

        // For students, verify they own this plan
        if (role === "student") {
          const { data: studentData, error: studentError } = await supabase
            .from('student')
            .select('id')
            .eq('profile_id', session.user.id)
            .single();

          if (studentError || !studentData || studentData.id !== planData.student_id) {
            clientLogger.warn('Access denied: Student does not own this plan', { action: 'EditGradPlanPage.checkUserAccess', userId: session.user.id, planId: planData.id });
            router.push('/grad-plan');
            return;
          }
        }
        setGradPlan(planData);
        setIsActivePlan(planData.is_active);

        // Recalculate completion metadata on load to ensure it reflects current course status
        // (User may have changed course completion in another session/view)
        const planDetailsWithFreshMetadata = recalculatePlanCompletion(planData.plan_details);

        // Extract terms and events from the plan
        if (isRecord(planDetailsWithFreshMetadata)) {
          const candidate = planDetailsWithFreshMetadata;

          // Try to get the plan array
          let rawPlanArray: unknown[] | null = null;
          if (Array.isArray(candidate.plan)) {
            rawPlanArray = candidate.plan;
          } else if (Array.isArray(candidate.semesters)) {
            rawPlanArray = candidate.semesters;
          } else if (Array.isArray(candidate.terms)) {
            rawPlanArray = candidate.terms;
          }

          if (rawPlanArray) {
            const { terms, events: extractedEvents } = extractTermsAndEvents(rawPlanArray);
            if (terms.length > 0) {
              // Terms already have fresh completion metadata from recalculation above
              setCurrentPlanData(terms);
              console.log('currentPlanData:', JSON.stringify(terms, null, 2));
            }
            if (extractedEvents.length > 0) {
              setEvents(extractedEvents);
            }
          } else {
            // Fallback to old method
            const planArray = extractPlanArray(planDetailsWithFreshMetadata);
            if (planArray) {
              setCurrentPlanData(planArray);
            }
          }
        }

        setIsCheckingAccess(false);

      } catch (e: unknown) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Failed to load graduation plan');
        }
        setIsCheckingAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkUserAccess();
  }, [params.accessId, router, supabase]);

  React.useEffect(() => {
    let isActive = true;
    const loadPrograms = async () => {
      if (!gradPlan || !universityId) {
        setProgramsData([]);
        setGenEdProgram(null);
        return;
      }

      const programIds = gradPlan.programs.map((program) => String(program.id)).filter(Boolean);
      if (programIds.length > 0) {
        const programsRes = await fetch(
          `/api/programs/batch?ids=${programIds.join(',')}&universityId=${universityId}`
        );
        if (programsRes.ok) {
          const programsJson = await programsRes.json();
          if (isActive) {
            setProgramsData(Array.isArray(programsJson) ? programsJson : []);
          }
        }
      } else if (isActive) {
        setProgramsData([]);
      }

      const genEdRes = await fetch(`/api/programs?type=gen_ed&universityId=${universityId}`);
      if (genEdRes.ok) {
        const genEdJson = await genEdRes.json();
        if (isActive) {
          setGenEdProgram(Array.isArray(genEdJson) && genEdJson.length > 0 ? genEdJson[0] : null);
        }
      }
    };

    loadPrograms();
    return () => {
      isActive = false;
    };
  }, [gradPlan, universityId]);

  const handleBack = () => {
    if (userRole === "advisor") {
      router.push('/approve-grad-plans');
    } else {
      router.push('/grad-plan');
    }
  };

  const handleSaveChanges = async () => {
    if (!gradPlan || !currentPlanData) return;

    const currentPlanName = typeof gradPlan.plan_name === 'string' ? gradPlan.plan_name.trim() : '';

    // Check if plan still needs a name (not "Untitled Plan" and not empty)
    if (!currentPlanName || currentPlanName === 'Untitled Plan') {
      showSnackbar('Please name your graduation plan before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Merge events into plan array at correct positions
      const mergedPlan = mergePlanWithEvents(currentPlanData, events);

      const planDetailsWithEvents = {
        plan: mergedPlan,
        est_grad_sem: gradPlan.est_grad_sem,
        est_grad_date: gradPlan.est_grad_date,
        requestAdvisorReview,
      };

      // Recalculate completion metadata before saving to ensure it's fresh
      const planDetailsWithFreshMetadata = recalculatePlanCompletion(planDetailsWithEvents);

      // Update the existing plan (students can only update their own plans)
      const result = await updateStudentGradPlanAction(gradPlan.id, planDetailsWithFreshMetadata);

      if (result.success) {
        showSnackbar('Changes saved successfully!', 'success');
        // Optionally redirect back after a delay
        setTimeout(() => handleBack(), 2000);
      } else {
        showSnackbar(`Failed to save changes: ${result.error}`, 'error');
      }
    } catch (error) {
      clientLogger.error('Error saving graduation plan', error, { action: 'EditGradPlanPage.handleSaveChanges', planId: gradPlan.id });
      showSnackbar('An unexpected error occurred while saving.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivePlanToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;

    if (newValue && !isActivePlan) {
      // User wants to activate - show confirmation
      setShowActivePlanConfirm(true);
    } else if (!newValue && isActivePlan) {
      // User wants to deactivate - do it directly
      handleSetActivePlan(false);
    }
  };

  const handleSetActivePlan = async (active: boolean) => {
    if (!gradPlan) return;

    setIsSettingActive(true);
    try {
      if (active) {
        const result = await setGradPlanActiveAction(gradPlan.id);
        if (result.success) {
          setIsActivePlan(true);
          if (result.deactivatedPlanName) {
            showSnackbar(
              `This plan is now active. "${result.deactivatedPlanName}" has been deactivated.`,
              'success'
            );
          } else {
            showSnackbar('This plan is now active!', 'success');
          }
        } else {
          showSnackbar(`Failed to set plan as active: ${result.error}`, 'error');
        }
      } else {
        // Deactivate by calling the same function (it handles the logic)
        const { error: updateError } = await supabase
          .from('grad_plan')
          .update({ is_active: false })
          .eq('id', gradPlan.id);

        if (updateError) {
          showSnackbar('Failed to deactivate plan', 'error');
        } else {
          setIsActivePlan(false);
          showSnackbar('Plan deactivated', 'info');
        }
      }
    } catch (error) {
      clientLogger.error('Error updating plan active status', error, { action: 'EditGradPlanPage.handleSetActivePlan', planId: gradPlan.id });
      showSnackbar('An unexpected error occurred', 'error');
    } finally {
      setIsSettingActive(false);
      setShowActivePlanConfirm(false);
    }
  };

  if (isCheckingAccess || loading) {
    return (
      <Box sx={{ p: 3 }}>
        <StuLoader
          variant="inline"
          text={isCheckingAccess ? 'Checking access permissions...' : 'Loading graduation plan...'}
        />
      </Box>
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
          Back
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
          Back
        </Button>
        <Alert severity="warning">
          Graduation plan not found
        </Alert>
      </Box>
    );
  }

  const studentName = `${gradPlan.student_first_name} ${gradPlan.student_last_name}`;
  const isStudent = userRole === "student";
  const existingPlanName = typeof gradPlan.plan_name === 'string' ? gradPlan.plan_name.trim() : '';
  const selectedPlanName = existingPlanName;
  const requiresPlanName = !existingPlanName || existingPlanName === 'Untitled Plan';
  const isPlanNameValid = !requiresPlanName;
  const headerTitle = existingPlanName && existingPlanName !== 'Untitled Plan'
    ? `Edit ${existingPlanName}`
    : 'Edit Graduation Plan';
  const pageTitle = isStudent ? headerTitle : `Graduation Plan for ${studentName}`;
  const createdDisplay = new Date(gradPlan.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <TooltipProvider>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          maxWidth: '1400px',
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
            backgroundColor: 'var(--card)',
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
            Back to {isStudent ? 'My Plans' : 'Approval List'}
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
              {isStudent ? (
                <EditablePlanTitle
                  planId={gradPlan.id}
                  initialName={selectedPlanName || 'Untitled Plan'}
                  onSaved={(newName) => {
                    setGradPlan(prev => (prev ? { ...prev, plan_name: newName } : prev));
                    showSnackbar('Plan name updated successfully!', 'success');
                  }}
                  className="h4 font-display font-800 text-2xl md:text-[2.1rem]"
                />
              ) : (
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
                  {pageTitle}
                </Typography>
              )}

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
                  Created {createdDisplay}
                </Box>
                {!isStudent && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2.5,
                      py: 1,
                      borderRadius: '7px',
                      backgroundColor: 'color-mix(in srgb, var(--primary) 18%, white 82%)',
                      color: 'color-mix(in srgb, var(--foreground) 82%, var(--primary) 18%)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {studentName}
                  </Box>
                )}
              </Box>

              {gradPlan.programs.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {gradPlan.programs.map((program) => (
                    <Box
                      key={program.id}
                      sx={{
                        borderRadius: '7px',
                        border: '1px solid color-mix(in srgb, var(--primary) 45%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--primary) 12%, white)',
                        px: 2,
                        py: 0.75,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'color-mix(in srgb, var(--foreground) 78%, var(--primary) 22%)',
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {program.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

            </Box>

            {isStudent && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveChanges}
                    disabled={isSubmitting || !currentPlanData || !isPlanNameValid}
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
                        boxShadow: '0 10px 26px -18px rgba(10,31,26,0.6)',
                      },
                      '&:disabled': {
                        backgroundColor: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    {isSubmitting ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        color="primary"
                        checked={requestAdvisorReview}
                        onChange={(event) => setRequestAdvisorReview(event.target.checked)}
                        disabled={isSubmitting}
                      />
                    }
                    label="Request Advisor Review"
                    sx={{
                      m: 0,
                      '.MuiFormControlLabel-label': {
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: 'color-mix(in srgb, var(--foreground) 78%, var(--primary) 22%)',
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        color="primary"
                        checked={isActivePlan}
                        onChange={handleActivePlanToggle}
                        disabled={isSubmitting || isSettingActive}
                      />
                    }
                    label="Set as Active Plan"
                    sx={{
                      m: 0,
                      '.MuiFormControlLabel-label': {
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: 'color-mix(in srgb, var(--foreground) 78%, var(--primary) 22%)',
                      },
                    }}
                  />
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleBack}
                  disabled={isSubmitting}
                  sx={{
                    borderColor: 'color-mix(in srgb, var(--action-cancel) 70%, transparent)',
                    color: 'color-mix(in srgb, var(--action-cancel) 80%, var(--foreground) 20%)',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0.06em',
                    px: 3,
                    py: 1.25,
                    borderRadius: '7px',
                    '&:hover': {
                      borderColor: 'var(--action-cancel-hover)',
                      backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    },
                    '&:disabled': {
                      borderColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    },
                  }}
                >
                  Cancel
                </Button>
                {isDev && (
                  <Button
                    variant="outlined"
                    onClick={() => setShowJsonDebug(true)}
                    sx={{
                      borderColor: '#6366f1',
                      color: '#6366f1',
                      fontWeight: 600,
                      textTransform: 'none',
                      letterSpacing: '0.06em',
                      px: 2,
                      py: 1.25,
                      borderRadius: '7px',
                      fontSize: '0.75rem',
                      '&:hover': {
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      },
                    }}
                  >
                    View JSON
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {isStudent && requiresPlanName && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Click the plan title above to name your plan before submitting for approval.
            </Alert>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
              sx={{
                borderRadius: '7px',
                border: '1px solid',
                borderColor: 'color-mix(in srgb, rgba(10,31,26,0.16) 30%, var(--border) 70%)',
                backgroundColor: 'var(--card)',
                boxShadow: '0 48px 120px -80px rgba(10,31,26,0.45)',
                p: { xs: 2, md: 3 },
              }}
            >
              {(() => {
                const raw = normalizePlanDetails(gradPlan.plan_details, {
                  est_grad_sem: gradPlan.est_grad_sem,
                  est_grad_date: gradPlan.est_grad_date,
                });
                // Include plan name and programs in the plan data
                const enrichedPlan = {
                  ...raw,
                  plan_name: gradPlan.plan_name,
                  programs: gradPlan.programs,
                };
                console.log('🔄 Rendering GraduationPlanner with events:', events);
                console.log('📦 enrichedPlan being passed to GraduationPlanner:', JSON.stringify(enrichedPlan, null, 2));
                return (
                  <GraduationPlanner
                    plan={enrichedPlan}
                    isEditMode={isEditMode}
                    onPlanUpdate={handlePlanUpdate}
                    onSave={handleSave}
                    editorRole={userRole === 'advisor' ? 'advisor' : 'student'}
                    advisorChanges={advisorChanges}
                    externalEvents={events}
                    onEventsChange={setEvents}
                    onOpenEventDialog={handleRegisterEventDialogOpener}
                    gradPlanId={gradPlan.id}
                    onMoveCourseBlocked={() => {
                      showSnackbar('Completed courses cannot be moved', 'error');
                    }}
                  />
                );
              })()}
            </Box>

            {isStudent && (
              <Alert severity="info" sx={{ borderRadius: '7px' }}>
                You are editing your graduation plan. Drag courses between terms and add milestones, then submit for approval to lock in your updates.
              </Alert>
            )}
          </Box>

          {(gradPlan.advisor_notes || currentPlanData) && (
            <Box
              sx={{
                flex: { xs: '1 1 auto', lg: '0 0 550px' },
                minWidth: { xs: '100%', lg: '530px' },
                maxWidth: { lg: '550px' },
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                position: { lg: 'sticky' },
                top: { lg: 24 },
              }}
            >
              {/* Advisor Suggestions - shown at top when present */}
              {gradPlan.advisor_notes && (
                <AdvisorNotesBox
                  advisorNotes={gradPlan.advisor_notes}
                  advisorChanges={advisorChanges}
                />
              )}

              {/* Progress Overview Panel - NEW component */}
              <div className="rounded-[7px] border border-[color-mix(in_srgb,rgba(10,31,26,0.16)_30%,var(--border)_70%)] bg-[var(--card)] p-4 shadow-[0_42px_120px_-68px_rgba(8,35,24,0.55)] overflow-auto max-h-[calc(100vh-70px)]">
                <ProgressOverviewContainer
                  categories={progressData.categories}
                  overallProgress={progressData.overallProgress}
                />
              </div>
            </Box>
          )}
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

        {/* Debug JSON Dialog - Only in Development */}
        {isDev && (
          <Dialog
            open={showJsonDebug}
            onClose={() => setShowJsonDebug(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                Plan Data Debug (Development Only)
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6366f1' }}>
                    Events in State ({events.length} total):
                  </Typography>
                  <pre style={{
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    overflow: 'auto',
                    fontSize: '12px',
                    border: '1px solid #e5e7eb',
                  }}>
                    {JSON.stringify(events, null, 2)}
                  </pre>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#10b981' }}>
                    Plan with Inline Events (What will be saved):
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', mb: 1, display: 'block' }}>
                    Events are merged into the plan array at their correct positions
                  </Typography>
                  <pre style={{
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    overflow: 'auto',
                    fontSize: '12px',
                    border: '1px solid #e5e7eb',
                  }}>
                    {JSON.stringify({
                      plan: currentPlanData && events ? mergePlanWithEvents(currentPlanData, events) : currentPlanData,
                      est_grad_sem: gradPlan?.est_grad_sem,
                      est_grad_date: gradPlan?.est_grad_date,
                    }, null, 2)}
                  </pre>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowJsonDebug(false)} sx={{ textTransform: 'none' }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Active Plan Confirmation Dialog */}
        <Dialog
          open={showActivePlanConfirm}
          onClose={() => !isSettingActive && setShowActivePlanConfirm(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Set as Active Plan?
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Setting this plan as active will deactivate your current active plan.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your active plan is the one displayed on your dashboard and used for academic tracking.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowActivePlanConfirm(false)}
              disabled={isSettingActive}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSetActivePlan(true)}
              variant="contained"
              disabled={isSettingActive}
              sx={{
                backgroundColor: '#0a1f1a',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#043322',
                },
              }}
            >
              {isSettingActive ? 'Setting Active...' : 'Set as Active'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </TooltipProvider>
  );
}
