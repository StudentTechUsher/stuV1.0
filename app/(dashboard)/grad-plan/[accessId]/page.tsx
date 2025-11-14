'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchGradPlanForEditing, submitGradPlanForApproval, decodeAccessIdServerAction } from '@/lib/services/server-actions';
import { StuLoader } from '@/components/ui/StuLoader';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import AdvisorNotesBox from '@/components/grad-planner/AdvisorNotesBox';
import { Event } from '@/components/grad-planner/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AdvisorProgressPanel, calculateCategoryProgress } from '@/components/grad-planner/AdvisorProgressPanel';
import mockExpandableCategories from '@/components/grad-planner/mockExpandableData';
import EditablePlanTitle from '@/components/EditablePlanTitle';

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
}

interface Term {
  term: string;
  notes?: string;
  courses?: Array<{
    code: string;
    title: string;
    credits: number;
    fulfills?: string[];
  }>;
  credits_planned?: number;
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
      if (isTermArray(candidate[key])) {
        return candidate[key] as Term[];
      }
    }
    const nested = candidate.plan_details;
    if (isRecord(nested) && isTermArray(nested.plan)) {
      return nested.plan;
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
  const [isPanelCollapsed, setIsPanelCollapsed] = React.useState(false);

  const isEditMode = true; // Always in edit mode for this page

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
      console.error('Error reading advisor changes from localStorage:', e);
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

  const supabase = createSupabaseBrowserClient();

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
      ? `Plan saved! ${eventCount} event${eventCount === 1 ? '' : 's'} stored locally for now.`
      : 'Plan saved!';
    showSnackbar(eventMessage, 'success');
    // TODO: In the future, persist events to database
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

        // Get user role
        const role: Role = ROLE_MAP[profile?.role_id ?? "3"];
        setUserRole(role);

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
            console.error('Access denied: Student does not own this plan');
            router.push('/dashboard/grad-plan');
            return;
          }
        }
        setGradPlan(planData);

        // Initialize currentPlanData with the fetched plan so Submit is enabled for new plans
        const planArray = extractPlanArray(planData.plan_details);
        if (planArray) {
          setCurrentPlanData(planArray);
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

  const handleBack = () => {
    if (userRole === "advisor") {
      router.push('/dashboard/approve-grad-plans');
    } else {
      router.push('/dashboard/grad-plan');
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
      // For students, submit for approval with program IDs
      const programIds = gradPlan.programs.map(p => p.id);

      // Get current user session to get profile_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User session not found');
      }

      const result = await submitGradPlanForApproval(session.user.id, currentPlanData, programIds, currentPlanName);

      if (result.success) {
        showSnackbar('Changes submitted for approval successfully!', 'success');
        // Optionally redirect back after a delay
        setTimeout(() => handleBack(), 2000);
      } else {
        showSnackbar(`Failed to submit changes: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error saving graduation plan:', error);
      showSnackbar('An unexpected error occurred while saving.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate category progress for the progress panel
  const categoryProgress = React.useMemo(() => {
    if (!currentPlanData) return [];
    return calculateCategoryProgress(currentPlanData);
  }, [currentPlanData]);

  // Calculate total credits for progress panel
  const totalCreditsData = React.useMemo(() => {
    if (!currentPlanData) return { earned: 0, required: 133.66 };

    const earned = currentPlanData.reduce((total, term) => {
      const termCredits = term.credits_planned ||
                         (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
      return total + termCredits;
    }, 0);

    return { earned, required: 133.66 };
  }, [currentPlanData]);

  // Calculate current semester credits (assuming first term is current)
  const currentSemesterCredits = React.useMemo(() => {
    if (!currentPlanData || currentPlanData.length === 0) return 0;
    const currentTerm = currentPlanData[0];
    return currentTerm.credits_planned ||
           (currentTerm.courses ? currentTerm.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
  }, [currentPlanData]);

  // Calculate total planned credits in the grad plan
  const plannedCredits = React.useMemo(() => {
    if (!currentPlanData) return 0;
    return currentPlanData.reduce((total, term) => {
      const termCredits = term.credits_planned ||
                         (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
      return total + termCredits;
    }, 0);
  }, [currentPlanData]);

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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
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
                {isSubmitting ? 'Submitting…' : 'Submit for Approval'}
              </Button>
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
              backgroundColor: '#ffffff',
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

        {(gradPlan.advisor_notes || (isEditMode && currentPlanData) || currentPlanData) && (
          <Box
            sx={{
              flex: isPanelCollapsed
                ? { xs: '0 0 auto', lg: '0 0 80px' }
                : { xs: '1 1 auto', lg: '0 0 380px' },
              minWidth: isPanelCollapsed
                ? { xs: '100%', lg: '80px' }
                : { xs: '100%', lg: '360px' },
              maxWidth: isPanelCollapsed
                ? { lg: '80px' }
                : { lg: '380px' },
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              position: { lg: 'sticky' },
              top: { lg: 24 },
              transition: 'all 0.3s ease',
            }}
          >
            {/* Advisor Suggestions - shown at top when present */}
            {gradPlan.advisor_notes && (
              <AdvisorNotesBox
                advisorNotes={gradPlan.advisor_notes}
                advisorChanges={advisorChanges}
              />
            )}

            {/* Progress Panel - shown for both students and advisors */}
            {currentPlanData && (
              <AdvisorProgressPanel
                studentName={studentName}
                totalCredits={totalCreditsData}
                categories={categoryProgress}
                planData={currentPlanData}
                isCollapsed={isPanelCollapsed}
                onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
                currentSemesterCredits={currentSemesterCredits}
                plannedCredits={plannedCredits}
                expandableCategories={mockExpandableCategories}
              />
            )}
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
    </Box>
  );
}
