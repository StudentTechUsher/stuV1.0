'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Snackbar, Alert, Paper } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { decodeAccessIdClient } from '@/lib/utils/access-id';
import { fetchGradPlanById, updateGradPlanWithAdvisorNotes, approveGradPlan } from '@/lib/api/server-actions';
import GradPlanViewer from '@/components/approve-grad-plans/grad-plan-viewer';
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

type Role = "student" | "advisor" | "admin";

const ROLE_MAP: Record<string, Role> = {
  1: "admin",
  2: "advisor",
  3: "student",
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
  const [isCheckingRole, setIsCheckingRole] = React.useState(true);
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

  const handleSuggestionsChange = React.useCallback((hasSuggestions: boolean, suggestions: Record<string, string>) => {
    setHasSuggestions(hasSuggestions);
    setSuggestions(suggestions);
  }, []);

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
          console.log('Access denied: User is not an advisor');
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
        const gradPlanId = decodeAccessIdClient(accessId);

        if (!gradPlanId) {
          throw new Error('Invalid or expired access link');
        }

        // Fetch the detailed grad plan data using gradPlanId
        const planData = await fetchGradPlanById(gradPlanId);
        
        if (!active) return;
        
        if (!planData) {
          throw new Error('Graduation plan not found or no longer pending approval');
        }
        
        setGradPlan(planData);

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
    router.push('/dashboard/approve-grad-plans');
  };

  const handleApprove = async () => {
    if (!gradPlan) return;
    
    setIsProcessing(true);
    
    try {
      const result = await approveGradPlan(gradPlan.id);
      
      if (result.success) {
        showSnackbar('Graduation plan approved successfully! The student can now view their active plan.', 'success');
        setTimeout(() => router.push('/dashboard/approve-grad-plans'), 2000);
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

  const handleReject = async () => {
    if (!gradPlan) return;
    
    setIsProcessing(true);
    
    try {
      // Format suggestions into advisor notes
      const advisorNotes = formatSuggestionsForAdvisorNotes(suggestions);
      
      if (!hasSuggestions || advisorNotes.trim() === '') {
        showSnackbar('Please add suggestions using the "+ Suggest Edit" buttons before submitting.', 'warning');
        return;
      }
      
      // Update the graduation plan with advisor notes
      const result = await updateGradPlanWithAdvisorNotes(gradPlan.id, advisorNotes);
      
      if (result.success) {
        showSnackbar('Suggested edits submitted successfully. Feedback has been sent to the student.', 'success');
        setTimeout(() => router.push('/dashboard/approve-grad-plans'), 2000);
      } else {
        showSnackbar(`Failed to submit suggested edits: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error submitting suggested edits:', error);
      showSnackbar('Failed to submit suggested edits. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getApproveButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (hasSuggestions) return 'Cannot Approve (Has Suggestions)';
    return 'Approve Plan';
  };

  if (isCheckingRole || loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {isCheckingRole ? 'Checking permissions...' : 'Loading graduation plan...'}
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
  
  const getRejectButtonText = () => {
    if (isProcessing) return 'Submitting...';
    if (hasSuggestions) return 'Submit Suggested Edits';
    return 'Submit Suggested Edits';
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header with back button */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Approval List
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
          Review Graduation Plan
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Submitted: {new Date(gradPlan.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Typography>
      </Box>

      {/* Plan Details */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#fafafa' }}>
        <GradPlanViewer 
          planDetails={gradPlan.plan_details} 
          studentName={studentName} 
          programs={gradPlan.programs}
          onSuggestionsChange={handleSuggestionsChange}
        />
      </Paper>

      {/* Action Buttons */}
      {hasSuggestions ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have suggestions for this plan. Click &quot;Submit Suggested Edits&quot; to send feedback to the student.
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          To provide feedback, click &quot;+ Suggest Edit&quot; on any term where you have suggestions, then submit your edits.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleApprove}
          disabled={hasSuggestions || isProcessing}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: (hasSuggestions || isProcessing) ? 'none' : '0 4px 12px rgba(76, 175, 80, 0.3)',
            opacity: (hasSuggestions || isProcessing) ? 0.6 : 1,
            '&:hover': {
              boxShadow: (hasSuggestions || isProcessing) ? 'none' : '0 6px 16px rgba(76, 175, 80, 0.4)'
            },
            '&:disabled': {
              backgroundColor: '#ccc',
              color: '#666'
            }
          }}
        >
          {getApproveButtonText()}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<Cancel />}
          onClick={handleReject}
          disabled={isProcessing || !hasSuggestions}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            backgroundColor: hasSuggestions && !isProcessing ? '#ffc107' : '#fff3cd',
            color: hasSuggestions && !isProcessing ? '#000' : '#6c757d',
            border: hasSuggestions && !isProcessing ? '1px solid #ffc107' : '1px solid #e0e0e0',
            boxShadow: hasSuggestions && !isProcessing ? '0 4px 12px rgba(255, 193, 7, 0.3)' : 'none',
            opacity: (!hasSuggestions || isProcessing) ? 0.6 : 1,
            '&:hover': {
              backgroundColor: hasSuggestions && !isProcessing ? '#ffb300' : '#fff3cd',
              boxShadow: hasSuggestions && !isProcessing ? '0 6px 16px rgba(255, 193, 7, 0.4)' : 'none'
            },
            '&:disabled': {
              backgroundColor: '#fff3cd',
              color: '#6c757d',
              border: '1px solid #e0e0e0'
            }
          }}
        >
          {getRejectButtonText()}
        </Button>
      </Box>

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