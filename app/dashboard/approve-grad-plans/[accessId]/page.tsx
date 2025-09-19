'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { decodeAccessIdClient } from '@/lib/utils/access-id';
import { fetchGradPlanById, updateGradPlanWithAdvisorNotes } from '@/lib/api/server-actions';
import GradPlanViewer from '@/components/approve-grad-plans/grad-plan-viewer';

interface GradPlanDetails {
  id: string;
  student_first_name: string;
  student_last_name: string;
  created_at: string;
  plan_details: unknown;
  student_id: number;
}

export default function ApproveGradPlanPage() {
  const router = useRouter();
  const params = useParams();
  const [gradPlan, setGradPlan] = React.useState<GradPlanDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSuggestions, setHasSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);

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

  React.useEffect(() => {
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
  }, [params.accessId]);

  const handleBack = () => {
    router.push('/dashboard/approve-grad-plans');
  };

  const handleApprove = () => {
    // Implementation for approval logic will be added in future
    console.log('Approving grad plan:', gradPlan?.id);
    alert('Approval functionality will be implemented soon');
  };

  const handleReject = async () => {
    if (!gradPlan) return;
    
    setIsProcessing(true);
    
    try {
      // Format suggestions into advisor notes
      const advisorNotes = formatSuggestionsForAdvisorNotes(suggestions);
      
      if (hasSuggestions && advisorNotes.trim() === '') {
        alert('Please provide feedback in the suggestion fields before rejecting.');
        return;
      }
      
      // Update the graduation plan with advisor notes
      const result = await updateGradPlanWithAdvisorNotes(gradPlan.id, advisorNotes);
      
      if (result.success) {
        alert(`Plan rejected successfully. ${hasSuggestions ? 'Feedback has been sent to the student.' : ''}`);
        router.push('/dashboard/approve-grad-plans');
      } else {
        alert(`Failed to reject plan: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting plan:', error);
      alert('Failed to reject plan. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading graduation plan...
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
    if (isProcessing) return 'Processing...';
    if (hasSuggestions) return 'Reject with Feedback';
    return 'Reject Plan';
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
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Please review the graduation plan below and decide whether to approve or reject it.
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
          onSuggestionsChange={handleSuggestionsChange}
        />
      </Paper>

      {/* Action Buttons */}
      {hasSuggestions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have suggestions for this plan. Please use the &quot;Reject Plan&quot; button to send feedback to the student.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleApprove}
          disabled={hasSuggestions}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: hasSuggestions ? 'none' : '0 4px 12px rgba(76, 175, 80, 0.3)',
            opacity: hasSuggestions ? 0.6 : 1,
            '&:hover': {
              boxShadow: hasSuggestions ? 'none' : '0 6px 16px rgba(76, 175, 80, 0.4)'
            },
            '&:disabled': {
              backgroundColor: '#ccc',
              color: '#666'
            }
          }}
        >
          {hasSuggestions ? 'Cannot Approve (Has Suggestions)' : 'Approve Plan'}
        </Button>
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<Cancel />}
          onClick={handleReject}
          disabled={isProcessing}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: isProcessing ? 'none' : '0 4px 12px rgba(244, 67, 54, 0.3)',
            opacity: isProcessing ? 0.7 : 1,
            '&:hover': {
              boxShadow: isProcessing ? 'none' : '0 6px 16px rgba(244, 67, 54, 0.4)'
            },
            '&:disabled': {
              backgroundColor: '#ffcdd2',
              color: '#c62828'
            }
          }}
        >
          {getRejectButtonText()}
        </Button>
      </Box>
    </Box>
  );
}