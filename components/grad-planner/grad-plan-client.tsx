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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import GraduationPlanner from "@/components/grad-planner/graduation-planner";
import CreateGradPlanDialog from "@/components/grad-planner/create-grad-plan-dialog";
import ProgramSelectionDialog, { type ProgramSelections } from "@/components/grad-planner/ProgramSelectionDialog";
import EditablePlanTitle from "@/components/EditablePlanTitle";
import { PlusIcon } from 'lucide-react';
import { encodeAccessIdClient } from '@/lib/utils/access-id';
import { updateGradPlanNameAction, deleteGradPlanAction } from '@/lib/services/server-actions';
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
  const [planNameInput, setPlanNameInput] = useState('');
  const [planNameError, setPlanNameError] = useState<string | null>(null);
  const [isSavingPlanName, setIsSavingPlanName] = useState(false);
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);
  const [showPlanSwitcher, setShowPlanSwitcher] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Initialize gradPlans only once on mount
  useEffect(() => {
    setGradPlans(allGradPlans);
  }, []); // Only run on mount

  // Update selected plan when it changes in the list, but preserve it during editing
  useEffect(() => {
    if (!selectedGradPlan && activeGradPlan) {
      setSelectedGradPlan(activeGradPlan);
    }
  }, [activeGradPlan, selectedGradPlan]);

  // Update planNameInput when selectedGradPlan changes
  useEffect(() => {
    if (selectedGradPlan) {
      const currentName = typeof selectedGradPlan.plan_name === 'string'
        ? selectedGradPlan.plan_name.trim()
        : '';
      setPlanNameInput(currentName);
    }
  }, [selectedGradPlan]);

  const handleGradPlanSelection = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    const selectedPlan = gradPlans.find(plan => plan.id === selectedId);
    setSelectedGradPlan(selectedPlan || null);
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

  const handleTitleSave = async (newName: string): Promise<{ success: boolean; error?: string }> => {
    if (!selectedGradPlan) {
      return { success: false, error: 'No plan selected' };
    }

    try {
      const result = await updateGradPlanNameAction(selectedGradPlan.id, newName);

      if (result.success) {
        // Update local state - create new objects to trigger re-render
        const updatedPlan = { ...selectedGradPlan, plan_name: newName };

        setGradPlans(prev =>
          prev.map(plan => (plan.id === selectedGradPlan.id ? updatedPlan : plan))
        );
        setSelectedGradPlan(updatedPlan);

        setNotification({
          open: true,
          message: 'Plan name updated.',
          severity: 'success'
        });
      } else {
        setNotification({
          open: true,
          message: result.error ?? 'Failed to update plan name.',
          severity: 'error'
        });
      }

      return result;
    } catch (error) {
      console.error('Error updating plan name:', error);
      const errorMessage = 'Error updating plan name. Please try again.';
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      return { success: false, error: errorMessage };
    }
  };

  const handleEditPlan = async () => {
    // Always redirect to unified editing route
    if (selectedGradPlan?.id) {
      // selectedGradPlan is a database record with an id field
      const planId = selectedGradPlan.id;
      const accessId = encodeAccessIdClient(planId);
      router.push(`/grad-plan/${accessId}`);
    } else {
      // No plan exists, shouldn't happen but handle gracefully
      setNotification({
        open: true,
        message: 'No graduation plan found to edit',
        severity: 'error'
      });
    }
  };

  const handlePlanNameBlur = async () => {
    if (!selectedGradPlan || isSavingPlanName) return;

    const trimmedName = planNameInput.trim();
    const currentName = typeof selectedGradPlan.plan_name === 'string'
      ? selectedGradPlan.plan_name.trim()
      : '';

    // If unchanged, just exit edit mode
    if (trimmedName === currentName) {
      setIsEditingPlanName(false);
      setPlanNameError(null);
      return;
    }

    // Validate the new name
    const validation = validatePlanName(trimmedName, { allowEmpty: false });
    if (!validation.isValid) {
      setPlanNameError(validation.error);
      // Revert to original name
      setPlanNameInput(currentName);
      setIsEditingPlanName(false);
      setNotification({ open: true, message: validation.error, severity: 'error' });
      return;
    }

    const sanitizedName = validation.sanitizedValue;

    // Save the new name
    setIsSavingPlanName(true);
    try {
      const result = await updateGradPlanNameAction(selectedGradPlan.id, sanitizedName);
      if (!result.success) {
        const message = result.error ?? 'Failed to update plan name.';
        setPlanNameError(message);
        setPlanNameInput(currentName); // Revert
        setNotification({ open: true, message, severity: 'error' });
        return;
      }

      // Update local state
      setGradPlans(prev =>
        prev.map(plan => (plan.id === selectedGradPlan.id ? { ...plan, plan_name: sanitizedName } : plan))
      );
      setSelectedGradPlan(prev => prev ? { ...prev, plan_name: sanitizedName } : prev);
      setPlanNameInput(sanitizedName);
      setPlanNameError(null);
      setNotification({ open: true, message: 'Plan name updated!', severity: 'success' });
    } catch (error) {
      console.error('Error updating plan name:', error);
      setPlanNameInput(currentName); // Revert
      setNotification({ open: true, message: 'Failed to update plan name.', severity: 'error' });
    } finally {
      setIsSavingPlanName(false);
      setIsEditingPlanName(false);
    }
  };

  const selectedPlanName = selectedGradPlan && typeof selectedGradPlan.plan_name === 'string'
    ? selectedGradPlan.plan_name.trim()
    : '';
  const handlePlanNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur(); // Trigger onBlur to save
    } else if (event.key === 'Escape') {
      // Revert to original name
      const currentName = typeof selectedGradPlan?.plan_name === 'string'
        ? selectedGradPlan.plan_name.trim()
        : '';
      setPlanNameInput(currentName);
      setPlanNameError(null);
      setIsEditingPlanName(false);
      event.currentTarget.blur();
    }
  };

  const handleDeletePlan = async (planId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the plan selection

    const planToDelete = gradPlans.find(p => p.id === planId);
    if (!planToDelete) return;

    const planName = typeof planToDelete.plan_name === 'string' && planToDelete.plan_name.trim()
      ? planToDelete.plan_name.trim()
      : 'Untitled Plan';

    if (!confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteGradPlanAction(planId);

      if (result.success) {
        // Remove the plan from the local state
        const updatedPlans = gradPlans.filter(p => p.id !== planId);
        setGradPlans(updatedPlans);

        // If the deleted plan was selected, select the first remaining plan or null
        if (selectedGradPlan?.id === planId) {
          const newSelectedPlan = updatedPlans.length > 0 ? updatedPlans[0] : null;
          setSelectedGradPlan(newSelectedPlan);
        }

        setNotification({
          open: true,
          message: 'Graduation plan deleted successfully!',
          severity: 'success'
        });

        // Close the dialog if no plans remain
        if (updatedPlans.length === 0) {
          setShowPlanSwitcher(false);
        }
      } else {
        setNotification({
          open: true,
          message: result.error || 'Failed to delete graduation plan',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting graduation plan:', error);
      setNotification({
        open: true,
        message: 'An unexpected error occurred while deleting the plan',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

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

  const handleShowSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity: severity === 'info' || severity === 'warning' ? 'success' : severity
    });
  };

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
      router.push(`/grad-plan/${accessId}`);
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <div className="space-y-6">
        <section className="rounded-[7px] border border-[color-mix(in_srgb,rgba(0,0,0,0.14)_18%,var(--border)_82%)] bg-white px-6 py-6 shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[color-mix(in_srgb,var(--muted-foreground)_60%,black_40%)]">
                  Graduation Plan
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedGradPlan ? (
                    <EditablePlanTitle
                      planId={selectedGradPlan.id}
                      initialName={selectedPlanName}
                      onSaved={handleTitleSave}
                      className="text-2xl font-semibold tracking-tight text-[#0a1f1a]"
                    />
                  ) : (
                    <h1 className="text-2xl font-semibold tracking-tight text-[#0a1f1a]">
                      Untitled Graduation Plan
                    </h1>
                  )}
                  {selectedPlanCreatedAt && (
                    <span className="inline-flex items-center rounded-full bg-[#0a1f1a] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_-20px_rgba(10,31,26,0.65)]">
                      Created {selectedPlanCreatedAt}
                    </span>
                  )}
                </div>
                {selectedGradPlan && !selectedPlanName && (
                  <p className="max-w-xl text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted-foreground)_68%,black_32%)]">
                    Click on the title above to give this plan a name.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="contained"
                  onClick={handleCreatePlan}
                  className="font-body-semi"
                  sx={{
                    backgroundColor: '#0a1f1a',
                    color: '#ffffff',
                    px: 2.5,
                    '&:hover': { backgroundColor: '#043322' }
                  }}
                >
                  <PlusIcon style={{ marginRight: 8 }} />
                  Create New Plan
                </Button>
                {selectedGradPlan && (
                  <Button
                    variant="outlined"
                    onClick={handleEditPlan}
                    className="font-body-semi"
                    sx={{
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                      px: 2.5,
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
                    Edit Plan
                  </Button>
                )}
              </div>
            </div>

            {allGradPlans.length > 1 && (
              <div className="flex flex-col gap-3">
                <FormControl sx={{ minWidth: 260 }} size="small">
                  <InputLabel
                    id="grad-plan-select-label"
                    className="font-body"
                    sx={{
                      color: '#0a1f1a',
                      '&.Mui-focused': { color: '#043322' }
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
                      borderRadius: '7px',
                      fontWeight: 500,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(10,31,26,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#0a1f1a',
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
                          : `Plan ${String(plan.id).slice(0, 8)} • ${fallbackCreatedAt}`;
                        return (
                          <MenuItem key={plan.id} value={plan.id} className="font-body">
                            {fallbackLabel}
                          </MenuItem>
                        );
                      }
                    })}
                  </Select>
                </FormControl>
              </div>
            )}
          </div>
        </section>

        {selectedGradPlan ? (
          <GraduationPlanner
            plan={(() => {
              const planDetails = selectedGradPlan.plan_details;
              // If plan_details is an array, wrap it in an object with a 'plan' key
              if (Array.isArray(planDetails)) {
                return {
                  plan: planDetails,
                  plan_name: selectedGradPlan.plan_name,
                  programs: selectedGradPlan.programs,
                  est_grad_sem: studentRecord?.est_grad_sem,
                  est_grad_date: studentRecord?.est_grad_date
                };
              }
              // Otherwise, spread it and add graduation fields
              return {
                ...(planDetails as Record<string, unknown>),
                plan_name: selectedGradPlan.plan_name,
                programs: selectedGradPlan.programs,
                est_grad_sem: studentRecord?.est_grad_sem,
                est_grad_date: studentRecord?.est_grad_date
              };
            })()}
            isEditMode={false}
          />
        ) : (
          <Box 
            sx={{
              textAlign: 'center',
              py: 6,
              px: 4,
              backgroundColor: 'var(--muted)',
              borderRadius: '7px',
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
      </div>

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
          selectedProgramIds={
            programSelections.isGraduateStudent
              ? programSelections.graduateProgramIds
              : [...programSelections.majorIds, ...programSelections.minorIds]
          }
          genEdProgramIds={programSelections.genEdIds}
          genEdStrategy={programSelections.genEdStrategy}
          planMode={programSelections.planMode}
          universityId={studentRecord?.university_id || 0}
          userId={user?.id}
          onPlanCreated={handlePlanCreated}
          initialPlanName={programSelections.planName}
          prompt={prompt}
          isGraduateStudent={programSelections.isGraduateStudent}
          onShowSnackbar={handleShowSnackbar}
        />
      )}

      {/* Plan Switcher Dialog */}
      <Dialog
        open={showPlanSwitcher}
        onClose={() => setShowPlanSwitcher(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(10,31,26,0.2)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0a1f1a' }}>
              Switch Graduation Plan
            </Typography>
            <IconButton
              onClick={() => setShowPlanSwitcher(false)}
              size="small"
              sx={{ color: 'rgba(10,31,26,0.6)' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ color: 'rgba(10,31,26,0.6)', mt: 0.5 }}>
            Select a graduation plan to view
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {gradPlans.map((plan) => {
              const planName = typeof plan.plan_name === 'string'
                ? (plan.plan_name ?? '').trim()
                : '';
              const isSelected = plan.id === selectedGradPlan?.id;

              let createdAt = 'Unknown Date';
              try {
                createdAt = plan.created_at
                  ? new Date(plan.created_at as string).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Unknown Date';
              } catch {
                createdAt = 'Unknown Date';
              }

              const displayName = planName.length > 0 ? planName : 'Untitled Plan';

              return (
                <Box
                  key={plan.id}
                  onClick={() => {
                    const event = { target: { value: plan.id } } as SelectChangeEvent<string>;
                    handleGradPlanSelection(event);
                    setShowPlanSwitcher(false);
                  }}
                  sx={{
                    p: 2.5,
                    borderRadius: '7px',
                    border: isSelected ? '1.5px solid' : 'none',
                    borderColor: isSelected ? 'var(--primary)' : undefined,
                    backgroundColor: isSelected ? 'rgba(18,249,135,0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isSelected ? 'var(--primary)' : undefined,
                      backgroundColor: isSelected ? 'rgba(18,249,135,0.12)' : 'transparent',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#0a1f1a',
                          mb: 0.5,
                        }}
                      >
                        {displayName}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(10,31,26,0.6)',
                          display: 'block',
                        }}
                      >
                        Created {createdAt}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {!isSelected && (
                        <IconButton
                          onClick={(e) => handleDeletePlan(plan.id, e)}
                          size="small"
                          sx={{
                            color: 'rgba(244, 67, 54, 0.7)',
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              color: 'rgb(244, 67, 54)',
                            },
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.25 4.5h13.5M7.5 8.25v4.5M10.5 8.25v4.5M3 4.5h12l-.75 9.75a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5L3 4.5zM6.75 4.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </IconButton>
                      )}
                      {isSelected && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '4px',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.667 3.5L5.25 9.917 2.333 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            ACTIVE
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
      </Dialog>

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
