'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Snackbar, Alert, Paper } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { decodeAccessIdClient } from '@/lib/utils/access-id';
import { fetchGradPlanForEditing, submitGradPlanForApproval } from '@/lib/api/server-actions';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface GradPlanDetails {
  id: string;
  student_first_name: string;
  student_last_name: string;
  created_at: string;
  plan_details: unknown;
  student_id: number;
  programs: Array<{ id: number; name: string }>;
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
  
  const isEditMode = true; // Always in edit mode for this page
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
        const gradPlanId = decodeAccessIdClient(accessId);

        if (!gradPlanId) {
          throw new Error('Invalid or expired access link');
        }

        // Fetch the detailed grad plan data using gradPlanId
        const planData = await fetchGradPlanForEditing(gradPlanId);
        
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
          sx={{ mb: 2 }}
        >
          Back to {isStudent ? 'My Plans' : 'Approval List'}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
            {isStudent ? 'Graduation Plan' : `${studentName}'s Graduation Plan`}
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
                  backgroundColor: '#4caf50',
                  color: 'white',
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: '#45a049',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)'
                  },
                  '&:disabled': {
                    backgroundColor: '#a5d6a7',
                    color: 'rgba(255, 255, 255, 0.7)'
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
                  borderColor: '#e57373',
                  color: '#d32f2f',
                  fontWeight: 'bold',
                  '&:hover': {
                    borderColor: '#f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)'
                  },
                  '&:disabled': {
                    borderColor: '#ffcdd2',
                    color: '#ef9a9a'
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
                    backgroundColor: '#e3f2fd',
                    borderRadius: 1,
                    border: '1px solid #bbdefb'
                  }}
                >
                  <Typography variant="caption" color="primary">
                    {program.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Plan Details */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#fafafa' }}>
        <GraduationPlanner 
          plan={gradPlan.plan_details as Record<string, unknown>}
          isEditMode={isEditMode}
          onPlanUpdate={handlePlanUpdate}
        />
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
