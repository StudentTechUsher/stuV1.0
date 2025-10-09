'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Snackbar, Alert, Paper, TextField, IconButton } from '@mui/material';
import { CheckCircle, Save } from '@mui/icons-material';
import { Add, Remove } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchGradPlanById, approveGradPlan, decodeAccessIdServerAction, updateGradPlanDetailsAndAdvisorNotesAction } from '@/lib/services/server-actions';
import { createNotifForGradPlanEdited, createNotifForGradPlanApproved } from '@/lib/services/notifService';
import GraduationPlanner from '@/components/grad-planner/graduation-planner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Course, Term } from '@/components/grad-planner/types';

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
    router.push('/dashboard/approve-grad-plans');
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
        setTimeout(() => router.push('/dashboard/approve-grad-plans'), 1100);
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
        } catch (notifyErr) {
          console.error('Approval notification dispatch failed (non-blocking):', notifyErr);
        }
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

  const getApproveButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (hasSuggestions) return 'Cannot Approve (Unsaved Suggestions)';
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

      {/* Planner + Suggestions (advisor-only) */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, backgroundColor: '#fafafa' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Pending Plan for {studentName}
          </Typography>
          <Box sx={{ display:'flex', gap:1 }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!unsavedChanges || isSaving}
            >
              {(() => {
                if (isSaving) return 'Saving...';
                if (unsavedChanges) return 'Save Changes and Notify Student';
                return 'Saved';
              })()}
            </Button>
          </Box>
        </Box>
        <GraduationPlanner
          plan={editablePlan ?? (gradPlan.plan_details as (Record<string, unknown> | Term[] | undefined))}
          isEditMode
          initialSpaceView
          editorRole="advisor"
          onPlanUpdate={(updated) => { setEditablePlan(updated); setUnsavedChanges(true); }}
        />
        {/* Advisor Suggestions UI */}
        <Box sx={{ mt:3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            Advisor Suggestions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add optional suggestions for specific terms. These notes are sent to the student.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2 }}>
            {(editablePlan || []).map((term, idx) => {
              const termKey = `term-${idx + 1}`;
              const has = Object.prototype.hasOwnProperty.call(suggestions, termKey);
              return (
                <Box key={termKey} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fff' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Term {term?.term || (idx + 1)}
                    </Typography>
                    {has ? (
                      <IconButton size="small" onClick={() => removeSuggestion(termKey)} sx={{ color: '#f44336' }}>
                        <Remove fontSize="small" />
                      </IconButton>
                    ) : (
                      <Button variant="outlined" size="small" startIcon={<Add />} onClick={() => addSuggestion(termKey)}>
                        Suggest Edit
                      </Button>
                    )}
                  </Box>
                  {has && (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Enter your suggestion for improving this term..."
                      value={suggestions[termKey] || ''}
                      onChange={(e) => updateSuggestion(termKey, e.target.value)}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
        <Box sx={{ mt:3 }}>
          <Alert severity={unsavedChanges ? 'warning':'info'}>
            {unsavedChanges ? 'You have unsaved changes. Saving your edits or suggestions does not approve the plan.' : 'You can move courses between terms or add per-term suggestions. Saving does not approve the plan.'}
          </Alert>
        </Box>
      </Paper>

      {/* Action Buttons */}
      {hasSuggestions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have unsaved suggestions. Click Save to send them and remove this plan from the approval queue.
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleApprove}
          disabled={hasSuggestions || isProcessing || unsavedChanges}
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
