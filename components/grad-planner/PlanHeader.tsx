'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import EditablePlanTitle from '@/components/EditablePlanTitle';
import ProgramSelectionDialog, { type ProgramSelections } from '@/components/grad-planner/ProgramSelectionDialog';
import CreateGradPlanDialog from '@/components/grad-planner/create-grad-plan-dialog';
import ProfileInfoDialog, { type ProfileData } from '@/components/grad-planner/ProfileInfoDialog';
import { PlusIcon } from 'lucide-react';
import { encodeAccessIdClient } from '@/lib/utils/access-id';
import { updateGradPlanNameAction } from '@/lib/services/server-actions';

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
  is_active?: boolean;
  [key: string]: unknown;
}

interface PlanHeaderProps {
  selectedGradPlan: GradPlanRecord | null;
  allGradPlans: GradPlanRecord[];
  onPlanChange?: (plan: GradPlanRecord | null) => void;
  universityId: number;
  prompt?: string;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  showPlanSelector?: boolean;
  showStatusBadge?: boolean;
  useChatbotFlow?: boolean;
  studentProfile?: {
    id?: string;
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
    [key: string]: unknown;
  };
  onProfileUpdate?: (updates: Record<string, string | null>) => void;
}

export default function PlanHeader({
  selectedGradPlan,
  allGradPlans,
  onPlanChange,
  universityId,
  prompt = '',
  showCreateButton = true,
  showEditButton = true,
  showPlanSelector = true,
  showStatusBadge = false,
  useChatbotFlow = false,
  studentProfile,
  onProfileUpdate,
}: Readonly<PlanHeaderProps>) {
  const router = useRouter();

  // Three-step dialog flow for creating new plans
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showProgramSelection, setShowProgramSelection] = useState(false);
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [programSelections, setProgramSelections] = useState<ProgramSelections | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const selectedPlanName =
    selectedGradPlan && typeof selectedGradPlan.plan_name === 'string'
      ? selectedGradPlan.plan_name.trim()
      : '';

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

  const handleGradPlanSelection = useCallback(
    (event: SelectChangeEvent<string>) => {
      const selectedId = event.target.value;
      const selectedPlan = allGradPlans.find((plan) => plan.id === selectedId);
      onPlanChange?.(selectedPlan || null);
    },
    [allGradPlans, onPlanChange]
  );

  const handleCreatePlan = useCallback(() => {
    // Use chatbot flow or traditional flow based on prop
    if (useChatbotFlow) {
      router.push('/grad-plan/create');
    } else {
      setShowProfileInfo(true);
    }
  }, [useChatbotFlow, router]);


  const handleProfileInfoNext = useCallback((data: ProfileData) => {
    setProfileData(data);

    // Update parent component's studentProfile state
    onProfileUpdate?.({
      est_grad_date: data.estGradDate,
      est_grad_sem: data.estGradSem,
      career_goals: data.careerGoals,
    });

    setShowProfileInfo(false);
    setShowProgramSelection(true);
  }, [onProfileUpdate]);

  const handleProfileInfoClose = useCallback(() => {
    setShowProfileInfo(false);
    setProfileData(null);
  }, []);

  const handleProgramSelectionNext = useCallback((selections: ProgramSelections) => {
    setProgramSelections(selections);
    setShowProgramSelection(false);
    setShowCourseSelection(true);
  }, []);

  const handleProgramSelectionClose = useCallback(() => {
    setShowProgramSelection(false);
    setProgramSelections(null);
  }, []);

  const handleCourseSelectionClose = useCallback(() => {
    setShowCourseSelection(false);
    setProgramSelections(null);
  }, []);

  const handleEditPlan = useCallback(() => {
    if (selectedGradPlan?.id) {
      const planId = selectedGradPlan.id;
      const accessId = encodeAccessIdClient(planId);
      router.push(`/grad-plan/${accessId}`);
    } else {
      setNotification({
        open: true,
        message: 'No graduation plan found to edit',
        severity: 'error',
      });
    }
  }, [selectedGradPlan, router]);

  const handleTitleSave = useCallback(
    async (newName: string): Promise<{ success: boolean; error?: string }> => {
      if (!selectedGradPlan) {
        return { success: false, error: 'No plan selected' };
      }

      try {
        const result = await updateGradPlanNameAction(selectedGradPlan.id, newName);

        if (result.success) {
          const updatedPlan = { ...selectedGradPlan, plan_name: newName };
          onPlanChange?.(updatedPlan);

          setNotification({
            open: true,
            message: 'Plan name updated.',
            severity: 'success',
          });
        } else {
          setNotification({
            open: true,
            message: result.error ?? 'Failed to update plan name.',
            severity: 'error',
          });
        }

        return result;
      } catch (error) {
        console.error('Error updating plan name:', error);
        const errorMessage = 'Error updating plan name. Please try again.';
        setNotification({
          open: true,
          message: errorMessage,
          severity: 'error',
        });
        return { success: false, error: errorMessage };
      }
    },
    [selectedGradPlan, onPlanChange]
  );

  const handleShowSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
      setNotification({
        open: true,
        message,
        severity: severity === 'info' || severity === 'warning' ? 'success' : severity,
      });
    },
    []
  );

  const handlePlanCreated = useCallback(
    (
      _aiGeneratedPlan: Term[],
      _programIds: number[],
      accessId?: string,
      _planName?: string
    ) => {
      setShowCourseSelection(false);
      setProgramSelections(null);

      setNotification({
        open: true,
        message: 'AI has created your graduation plan! Redirecting to editing view...',
        severity: 'success',
      });

      if (accessId) {
        router.push(`/grad-plan/${accessId}`);
      } else {
        console.error('No access ID returned from creation');
        setNotification({
          open: true,
          message: 'Plan created but failed to redirect. Please refresh the page.',
          severity: 'error',
        });
      }
    },
    [router]
  );

  const handleCloseNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <>
      <section className="rounded-lg border border-gray-400 bg-gray-200/50 px-6 py-6">
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
                {showStatusBadge && selectedGradPlan && (
                  selectedGradPlan.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 border border-green-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 border border-yellow-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-yellow-700">
                      Not Yet Approved
                    </span>
                  )
                )}
                {!showStatusBadge && selectedPlanCreatedAt && (
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
              {showCreateButton && (
                <Button
                  variant="contained"
                  onClick={handleCreatePlan}
                  className="font-body-semi"
                  sx={{
                    backgroundColor: '#0a1f1a',
                    color: '#ffffff',
                    px: 2.5,
                    '&:hover': { backgroundColor: '#043322' },
                  }}
                >
                  <PlusIcon style={{ marginRight: 8 }} />
                  Create New Plan
                </Button>
              )}
              {showEditButton && selectedGradPlan && (
                <Button
                  variant="contained"
                  onClick={handleEditPlan}
                  className="font-body-semi"
                  sx={{
                    backgroundColor: 'var(--primary)',
                    color: '#0a1f1a',
                    px: 2.5,
                    fontWeight: 700,
                    '&:hover': {
                      backgroundColor: 'var(--hover-green)',
                    },
                    '&:disabled': {
                      backgroundColor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                    },
                  }}
                >
                  Edit This Plan
                </Button>
              )}
            </div>
          </div>

          {showPlanSelector && allGradPlans.length > 1 && (
            <div className="flex flex-col gap-3">
              <FormControl sx={{ minWidth: 260 }} size="small">
                <InputLabel
                  id="grad-plan-select-label"
                  className="font-body"
                  sx={{
                    color: '#0a1f1a',
                    '&.Mui-focused': { color: '#043322' },
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
                  {allGradPlans.map((plan) => {
                    const planName =
                      typeof plan.plan_name === 'string' ? (plan.plan_name ?? '').trim() : '';
                    try {
                      const createdAt = plan.created_at
                        ? new Date(plan.created_at as string).toLocaleString()
                        : 'Unknown Date';
                      const label = planName.length > 0 ? planName : `Plan made on ${createdAt}`;
                      return (
                        <MenuItem key={plan.id} value={plan.id} className="font-body">
                          {label}
                        </MenuItem>
                      );
                    } catch (error) {
                      console.error('Error accessing plan data:', error);
                      const fallbackCreatedAt = plan.created_at
                        ? (() => {
                            try {
                              return new Date(plan.created_at as string).toLocaleString();
                            } catch {
                              return 'Unknown Date';
                            }
                          })()
                        : 'Unknown Date';
                      const fallbackLabel =
                        planName.length > 0
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

      {/* Step 0: Profile Info Dialog */}
      <ProfileInfoDialog
        open={showProfileInfo}
        onClose={handleProfileInfoClose}
        onNext={handleProfileInfoNext}
        initialData={{
          estGradDate: studentProfile?.est_grad_date,
          estGradSem: studentProfile?.est_grad_sem,
          careerGoals: studentProfile?.career_goals,
        }}
      />

      {/* Step 1: Program Selection Dialog */}
      <ProgramSelectionDialog
        open={showProgramSelection}
        onClose={handleProgramSelectionClose}
        onNext={handleProgramSelectionNext}
        universityId={universityId}
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
          universityId={universityId}
          onPlanCreated={handlePlanCreated}
          initialPlanName={programSelections.planName}
          prompt={prompt}
          isGraduateStudent={programSelections.isGraduateStudent}
          onShowSnackbar={handleShowSnackbar}
        />
      )}

      {/* Notifications */}
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
    </>
  );
}
