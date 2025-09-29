'use client';

import { useState } from 'react';
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
import GraduationPlanner from "@/components/grad-planner/graduation-planner";
import CreateGradPlanDialog from "@/components/grad-planner/create-grad-plan-dialog";
import { ProgramRow } from "@/types/program";
import { PlusIcon } from 'lucide-react';
import { encodeAccessIdClient } from '@/lib/utils/access-id';

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
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
  /**
   * Prompt string retrieved from ai_prompts table used to guide AI plan generation.
   * If retrieval fails upstream we pass an empty string so the dialog can still render.
   */
  prompt: string;
}

export default function GradPlanClient({ user, studentRecord, allGradPlans, activeGradPlan, programsData, genEdData, prompt }: Readonly<GradPlanClientProps>) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGradPlan, setSelectedGradPlan] = useState<GradPlanRecord | null>(activeGradPlan);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleGradPlanSelection = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    const selectedPlan = allGradPlans.find(plan => plan.id === selectedId);
    setSelectedGradPlan(selectedPlan || null);
  };

  const handleCreatePlan = () => {
    setIsDialogOpen(true);
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

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handlePlanCreated = (aiGeneratedPlan: Term[], programIds: number[], accessId?: string) => {
    // Close the create plan dialog
    setIsDialogOpen(false);
    
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
                {allGradPlans.map((plan) => {
                  try {
                    const createdAt = plan.created_at 
                      ? new Date(plan.created_at as string).toLocaleString()
                      : 'Unknown Date';
                    return (
                      <MenuItem key={plan.id} value={plan.id} className="font-body">
                        Plan made on {createdAt}
                      </MenuItem>
                    );
                  } catch (error) {
                    console.error('Error accessing plan data:', error);
                    return (
                      <MenuItem key={plan.id} value={plan.id} className="font-body">
                        Plan {plan.id.slice(0, 8)} - {plan.created_at
                          ? new Date(plan.created_at as string).toLocaleString()
                          : 'Unknown Date'}
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
          <GraduationPlanner 
            plan={selectedGradPlan.plan_details as Record<string, unknown>} 
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

      <CreateGradPlanDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        programsData={programsData}
        genEdData={genEdData}
        onPlanCreated={handlePlanCreated}
        prompt={prompt}
      />
      
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
