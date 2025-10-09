'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Snackbar, Alert, Paper } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchGradPlanForEditing, submitGradPlanForApproval, decodeAccessIdServerAction } from '@/lib/services/server-actions';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import AdvisorNotesBox from '@/components/grad-planner/AdvisorNotesBox';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
}

interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship';
  title: string;
  afterTerm: number;
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

  const handleSave = (updatedPlan: Term[], events: Event[]) => {
    setCurrentPlanData(updatedPlan);
    const eventCount = events.length;
    const eventMessage = eventCount > 0
      ? `Plan saved! ${eventCount} event${eventCount === 1 ? '' : 's'} stored locally for now.`
      : 'Plan saved!';
    showSnackbar(eventMessage, 'success');
    // TODO: In the future, persist events to database
  };

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

    setIsSubmitting(true);

    try {
      // For students, submit for approval with program IDs
      // For now, we'll extract program IDs from the existing plan
      const programIds = gradPlan.programs.map(p => p.id);
      
      // Get current user session to get profile_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('User session not found');
      }

      const result = await submitGradPlanForApproval(session.user.id, currentPlanData, programIds);

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

  if (isCheckingAccess || loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {isCheckingAccess ? 'Checking access permissions...' : 'Loading graduation plan...'}
          </Typography>
        </Box>
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

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header with back button */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{
            mb: 2,
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            color: 'var(--primary)',
            '&:hover': {
              backgroundColor: 'var(--primary-15)'
            }
          }}
        >
          Back to {isStudent ? 'My Plans' : 'Approval List'}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" sx={{
            fontFamily: '"Red Hat Display", sans-serif',
            fontWeight: 800,
            color: 'black',
            fontSize: '2rem'
          }}>
            {isStudent ? 'Edit Graduation Plan' : `Graduation Plan for ${studentName}`}
          </Typography>
          
          {isStudent && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveChanges}
                disabled={isSubmitting || !currentPlanData}
                sx={{
                  px: 3,
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontWeight: 600,
                  fontFamily: '"Inter", sans-serif',
                  '&:hover': {
                    backgroundColor: 'var(--hover-green)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(18, 249, 135, 0.3)'
                  },
                  '&:disabled': {
                    backgroundColor: 'var(--muted)',
                    color: 'var(--muted-foreground)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleBack}
                disabled={isSubmitting}
                sx={{
                  px: 3,
                  borderColor: 'var(--action-cancel)',
                  color: 'var(--action-cancel)',
                  fontWeight: 600,
                  fontFamily: '"Inter", sans-serif',
                  '&:hover': {
                    borderColor: 'var(--action-cancel-hover)',
                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)'
                  },
                  '&:disabled': {
                    borderColor: 'var(--muted)',
                    color: 'var(--muted-foreground)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Cancel Edits
              </Button>
            </Box>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Created: {new Date(gradPlan.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Typography>

        {gradPlan.programs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Programs:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {gradPlan.programs.map((program) => (
                <Box
                  key={program.id}
                  sx={{
                    px: 2,
                    py: 0.5,
                    backgroundColor: 'var(--primary-15)',
                    borderRadius: 2,
                    border: '1px solid var(--primary)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'var(--primary)', fontFamily: '"Inter", sans-serif', fontWeight: 600 }}>
                    {program.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Advisor Notes - Show above plan if present */}
      {gradPlan.advisor_notes && (
        <AdvisorNotesBox advisorNotes={gradPlan.advisor_notes} />
      )}

      {/* Plan Details */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, backgroundColor: 'var(--card)', borderRadius: 3, border: '1px solid var(--border)' }}>
        {(() => {
          const raw = normalizePlanDetails(gradPlan.plan_details, {
            est_grad_sem: gradPlan.est_grad_sem,
            est_grad_date: gradPlan.est_grad_date,
          });
          return (
            <GraduationPlanner
              plan={raw}
              isEditMode={isEditMode}
              onPlanUpdate={handlePlanUpdate}
              onSave={handleSave}
              editorRole={userRole === 'advisor' ? 'advisor' : 'student'}
              advisorChanges={advisorChanges}
            />
          );
        })()}
      </Paper>

      {/* Info Alert for Students */}
      {isStudent && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You are editing your graduation plan. Click courses to move them between terms, then click &quot;Submit for Approval&quot; to save your changes.
        </Alert>
      )}

      {/* Snackbar for notifications */}
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
