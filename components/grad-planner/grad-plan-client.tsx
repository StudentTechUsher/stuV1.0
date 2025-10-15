'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import GraduationPlanner from "@/components/grad-planner/graduation-planner";
import CreateGradPlanDialog from "@/components/grad-planner/create-grad-plan-dialog";
import ProgramSelectionDialog, { type ProgramSelections } from "@/components/grad-planner/ProgramSelectionDialog";
import { PlusIcon } from 'lucide-react';
import { encodeAccessIdClient } from '@/lib/utils/access-id';
import { updateGradPlanNameAction } from '@/lib/services/server-actions';
import { validatePlanName } from '@/lib/utils/plan-name-validation';

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

interface GradPlanRecord {
  id: string;
  plan_details: unknown;
  plan_name?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

interface GradPlanClientProps {
  user: {
    id: string;
    email?: string;
  } | null;
  studentRecord: {
    id: string;
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  } | null;
  allGradPlans: GradPlanRecord[];
  activeGradPlan: GradPlanRecord | null;
  /**
   * Prompt string retrieved from ai_prompts table used to guide AI plan generation.
   * If retrieval fails upstream we pass an empty string so the dialog can still render.
   */
  prompt: string;
}

export default function GradPlanClient({ user, studentRecord, allGradPlans, activeGradPlan, prompt }: Readonly<GradPlanClientProps>) {
  const router = useRouter();

  // Two-step dialog flow
  const [showProgramSelection, setShowProgramSelection] = useState(false);
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [programSelections, setProgramSelections] = useState<ProgramSelections | null>(null);

  const [gradPlans, setGradPlans] = useState<GradPlanRecord[]>(allGradPlans);
  const [selectedGradPlan, setSelectedGradPlan] = useState<GradPlanRecord | null>(activeGradPlan);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    setGradPlans(allGradPlans);
  }, [allGradPlans]);

  useEffect(() => {
    if (selectedGradPlan) {
      const updated = allGradPlans.find(plan => plan.id === selectedGradPlan.id);
      if (updated && updated !== selectedGradPlan) {
        setSelectedGradPlan(updated);
      }
    } else if (activeGradPlan) {
      setSelectedGradPlan(activeGradPlan);
    }
  }, [allGradPlans, activeGradPlan, selectedGradPlan]);

  const handleGradPlanSelection = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    const selectedPlan = gradPlans.find(plan => plan.id === selectedId);
    setSelectedGradPlan(selectedPlan || null);
    setIsRenaming(false);
    setRenameInput('');
    setRenameError(null);
  };

  const handleCreatePlan = () => {
    // Start with step 1: program selection
    setShowProgramSelection(true);
  };

  const handleProgramSelectionNext = (selections: ProgramSelections) => {
    // Save selections and move to step 2
    setProgramSelections(selections);
    setShowProgramSelection(false);
    setShowCourseSelection(true);
  };

  const handleProgramSelectionClose = () => {
    setShowProgramSelection(false);
    setProgramSelections(null);
  };

  const handleCourseSelectionClose = () => {
    setShowCourseSelection(false);
    setProgramSelections(null);
  };

  const handleStartRename = () => {
    if (!selectedGradPlan) return;
    const existingName = typeof selectedGradPlan.plan_name === 'string'
      ? (selectedGradPlan.plan_name ?? '').trim()
      : '';
    setRenameInput(existingName);
    setRenameError(null);
    setIsRenaming(true);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameInput('');
    setRenameError(null);
  };

  const handleRenameSave = async () => {
    if (!selectedGradPlan) return;

    const validation = validatePlanName(renameInput, { allowEmpty: false });
    if (!validation.isValid) {
      setRenameError(validation.error);
      return;
    }

    const sanitizedName = validation.sanitizedValue;
    const currentName = typeof selectedGradPlan.plan_name === 'string'
      ? (selectedGradPlan.plan_name ?? '').trim()
      : '';

    if (currentName === sanitizedName) {
      setIsRenaming(false);
      return;
    }

    setIsSavingRename(true);

    try {
      const result = await updateGradPlanNameAction(selectedGradPlan.id, sanitizedName);
      if (!result.success) {
        const message = result.error ?? 'Failed to rename plan. Please try again.';
        setRenameError(message);
        setNotification({
          open: true,
          message,
          severity: 'error'
        });
        return;
      }

      setGradPlans(prev =>
        prev.map(plan => (plan.id === selectedGradPlan.id ? { ...plan, plan_name: sanitizedName } : plan))
      );
      setSelectedGradPlan(prev => (prev ? { ...prev, plan_name: sanitizedName } : prev));
      setIsRenaming(false);
      setRenameInput('');
      setNotification({
        open: true,
        message: 'Plan name updated.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating plan name:', error);
      const message = 'Unexpected error renaming plan. Please try again.';
      setRenameError(message);
      setNotification({
        open: true,
        message,
        severity: 'error'
      });
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleEditPlan = async () => {
    // Always redirect to unified editing route
    if (selectedGradPlan?.id) {
      // selectedGradPlan is a database record with an id field
      const planId = selectedGradPlan.id;
      const accessId = encodeAccessIdClient(planId);
      router.push(`/dashboard/grad-plan/${accessId}`);
    } else {
      // No plan exists, shouldn't happen but handle gracefully
      setNotification({
        open: true,
        message: 'No graduation plan found to edit',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const selectedPlanName = selectedGradPlan && typeof selectedGradPlan.plan_name === 'string'
    ? selectedGradPlan.plan_name.trim()
    : '';
  const selectedPlanTitle = selectedPlanName || 'Untitled Graduation Plan';
  const selectedPlanCreatedAt = (() => {
    if (!selectedGradPlan?.created_at) return null;
    const createdValue = selectedGradPlan.created_at;
    if (typeof createdValue === 'string') {
      try {
        return new Date(createdValue).toLocaleString();
      } catch {
        return null;
      }
    }
    return null;
  })();
  const renameTrimmed = renameInput.trim();
  const renameSaveDisabled = isSavingRename || renameTrimmed.length === 0 || renameTrimmed === selectedPlanName;

  const handlePlanCreated = (aiGeneratedPlan: Term[], programIds: number[], accessId?: string, _planName?: string) => {
    // Close all dialogs
    setShowCourseSelection(false);
    setProgramSelections(null);

    // Show success notification
    setNotification({
      open: true,
      message: 'AI has created your graduation plan! Redirecting to editing view...',
      severity: 'success'
    });

    // Redirect to the unified editing view using the accessId
    if (accessId) {
      router.push(`/dashboard/grad-plan/${accessId}`);
    } else {
      console.error('No access ID returned from creation');
      setNotification({
        open: true,
        message: 'Plan created but failed to redirect. Please refresh the page.',
        severity: 'error'
      });
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <div>Please log in to view your graduation plan.</div>
      </Box>
    );
  }

  if (!studentRecord) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" className="font-header-bold" gutterBottom>
          Graduation Plan
        </Typography>
        <Typography variant="body1" className="font-body" color="text.secondary" gutterBottom>
          Student record not found. User ID: {user.id}
        </Typography>
        <Button
          variant="contained"
          className="font-body-semi"
          sx={{
            mt: 2,
            backgroundColor: 'var(--primary)',
            '&:hover': { backgroundColor: 'var(--hover-green)' }
          }}
        >
          Create Student Profile
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Title */}
      <Typography
        variant="h4"
        sx={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          mb: 3,
          fontSize: '2rem'
        }}
      >
        Graduation Plan
      </Typography>
      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 3, gap: 2 }}>
          {allGradPlans.length > 1 && (
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel
                id="grad-plan-select-label"
                className="font-body"
                sx={{
                  '&.Mui-focused': {
                    color: 'var(--primary-dark)',
                  },
                }}
              >
                Select Graduation Plan
              </InputLabel>
              <Select
                labelId="grad-plan-select-label"
                value={selectedGradPlan?.id || ''}
                label="Select Graduation Plan"
                onChange={handleGradPlanSelection}
                className="font-body"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                }}
              >
                {gradPlans.map((plan) => {
                  const planName = typeof plan.plan_name === 'string'
                    ? (plan.plan_name ?? '').trim()
                    : '';
                  try {
                    const createdAt = plan.created_at
                      ? new Date(plan.created_at as string).toLocaleString()
                      : 'Unknown Date';
                    const label = planName.length > 0
                      ? planName
                      : `Plan made on ${createdAt}`;
                    return (
                      <MenuItem key={plan.id} value={plan.id} className="font-body">
                        {label}
                      </MenuItem>
                    );
                  } catch (error) {
                    console.error('Error accessing plan data:', error);
                    const fallbackCreatedAt = plan.created_at
                      ? (() => {
                          try { return new Date(plan.created_at as string).toLocaleString(); }
                          catch { return 'Unknown Date'; }
                        })()
                      : 'Unknown Date';
                    const fallbackLabel = planName.length > 0
                      ? planName
                      : `Plan ${String(plan.id).slice(0, 8)} - ${fallbackCreatedAt}`;
                    return (
                      <MenuItem key={plan.id} value={plan.id} className="font-body">
                        {fallbackLabel}
                      </MenuItem>
                    );
                  }
                })}
              </Select>
            </FormControl>
          )}
          
          {selectedGradPlan && (
            <Button
              variant="contained"
              onClick={handleCreatePlan}
              className="font-body-semi"
              sx={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--hover-green)'
                }
              }}
            >
                <PlusIcon style={{ marginRight: 2 }} />
              Create New Grad Plan
            </Button>
          )}
          {selectedGradPlan && (
              <Button
                variant="outlined"
                onClick={handleEditPlan}
                className="font-body-semi"
                sx={{
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  '&:hover': {
                    borderColor: 'var(--hover-green)',
                    backgroundColor: 'var(--primary-15)',
                  },
                  '&:disabled': {
                    borderColor: 'var(--muted-foreground)',
                    color: 'var(--muted-foreground)',
                  },
                }}
              >
                Edit Graduation Plan
              </Button>
            )}
      </Box>
      
      {selectedGradPlan ? (
        <Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              mb: 3
            }}
          >
            <Box>
              <Typography variant="h5" className="font-header-bold" sx={{ mb: 0.5 }}>
                {selectedPlanTitle}
              </Typography>
              {selectedPlanCreatedAt && (
                <Typography variant="body2" color="text.secondary">
                  Created {selectedPlanCreatedAt}
                </Typography>
              )}
              {!selectedPlanName && (
                <Typography variant="caption" color="text.secondary">
                  Give this plan a name to make it easier to find later.
                </Typography>
              )}
            </Box>
            {!isRenaming && (
              <Button
                variant="text"
                onClick={handleStartRename}
                className="font-body-semi"
                sx={{
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  color: 'var(--primary)',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'var(--primary-15)'
                  }
                }}
              >
                {selectedPlanName ? 'Rename Plan' : 'Add Plan Name'}
              </Button>
            )}
          </Box>

          {isRenaming && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mb: 3,
                alignItems: { sm: 'center' }
              }}
            >
              <TextField
                label="Plan Name"
                value={renameInput}
                onChange={(event) => {
                  setRenameInput(event.target.value);
                  if (renameError) {
                    setRenameError(null);
                  }
                }}
                fullWidth
                autoFocus
                inputProps={{ maxLength: 100 }}
                error={Boolean(renameError)}
                helperText={renameError ?? 'Keep it professional - no slang or inappropriate language.'}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleRenameSave}
                  disabled={renameSaveDisabled}
                  className="font-body-semi"
                  sx={{
                    backgroundColor: 'var(--primary)',
                    '&:hover': { backgroundColor: 'var(--hover-green)' }
                  }}
                >
                  {isSavingRename ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="text"
                  onClick={handleRenameCancel}
                  disabled={isSavingRename}
                  className="font-body-semi"
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          <GraduationPlanner
            plan={(() => {
              const planDetails = selectedGradPlan.plan_details;
              // If plan_details is an array, wrap it in an object with a 'plan' key
              if (Array.isArray(planDetails)) {
                return {
                  plan: planDetails,
                  est_grad_sem: studentRecord?.est_grad_sem,
                  est_grad_date: studentRecord?.est_grad_date
                };
              }
              // Otherwise, spread it and add graduation fields
              return {
                ...(planDetails as Record<string, unknown>),
                est_grad_sem: studentRecord?.est_grad_sem,
                est_grad_date: studentRecord?.est_grad_date
              };
            })()}
            isEditMode={false}
          />
        </Box>
      ) : (
        <Box 
          sx={{
            textAlign: 'center',
            py: 6,
            px: 4,
            backgroundColor: 'var(--muted)',
            borderRadius: 3,
            border: '2px dashed',
            borderColor: 'var(--border)'
          }}
        >
          <Typography variant="h5" gutterBottom className="font-header-bold" sx={{ color: 'text.primary' }}>
            Welcome to Your Graduation Planner!
          </Typography>
          <Typography variant="body1" className="font-body" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            You don&apos;t have an active graduation plan yet. Submit one for approval to have it show here.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleCreatePlan}
              className="font-body-semi"
              sx={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                px: 4,
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'var(--hover-green)'
                }
              }}
            >
              <PlusIcon style={{ marginRight: 8 }} />
              Create My Graduation Plan
            </Button>
          </Box>
          <Typography variant="caption" className="font-body" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Don&apos;t worry - you can always edit and customize your plan later!
          </Typography>
        </Box>
      )}

      {/* Step 1: Program Selection Dialog */}
      <ProgramSelectionDialog
        open={showProgramSelection}
        onClose={handleProgramSelectionClose}
        onNext={handleProgramSelectionNext}
        universityId={studentRecord?.university_id || 0}
      />

      {/* Step 2: Course Selection Dialog */}
      {programSelections && (
        <CreateGradPlanDialog
          open={showCourseSelection}
          onClose={handleCourseSelectionClose}
          selectedProgramIds={[...programSelections.majorIds, ...programSelections.minorIds]}
          genEdProgramIds={programSelections.genEdIds}
          genEdStrategy={programSelections.genEdStrategy}
          planMode={programSelections.planMode}
          universityId={studentRecord?.university_id || 0}
          onPlanCreated={handlePlanCreated}
          initialPlanName={programSelections.planName}
          prompt={prompt}
        />
      )}
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
