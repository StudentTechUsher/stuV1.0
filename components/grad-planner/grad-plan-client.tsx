'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import GraduationPlanner from "@/components/grad-planner/graduation-planner";
import CreateGradPlanDialog from "@/components/grad-planner/create-grad-plan-dialog";
import { submitGradPlanForApproval } from "@/lib/api/server-actions";
import { GraduationPlan } from "@/types/graduation-plan";
import { ProgramRow } from "@/types/program";
import { PlusIcon } from 'lucide-react';

const RAIL_WIDTH = 80;

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
  gradPlanRecord: GraduationPlan | null;
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
}

export default function GradPlanClient({ user, studentRecord, gradPlanRecord, programsData, genEdData }: Readonly<GradPlanClientProps>) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState<Term[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCancelEdit, setCanCancelEdit] = useState(true);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCreatePlan = () => {
    setIsDialogOpen(true);
  };

  const handleEditPlan = async () => {
    if (isEditMode) {
      // Submit for approval
      if (!studentRecord?.id || !currentPlanData) {
        setNotification({
          open: true,
          message: 'Missing student information or plan data',
          severity: 'error'
        });
        return;
      }

      setIsSubmitting(true);
      
      try {
        const result = await submitGradPlanForApproval(studentRecord.id, currentPlanData);
        
        if (result.success) {
          setNotification({
            open: true,
            message: result.message,
            severity: 'success'
          });
          setIsEditMode(false);
          setCurrentPlanData(null);
          setCanCancelEdit(true); // Reset after successful submission
        } else {
          setNotification({
            open: true,
            message: result.message,
            severity: 'error'
          });
        }
      } catch (error) {
        console.error('Error submitting plan for approval:', error);
        setNotification({
          open: true,
          message: 'Failed to submit graduation plan for approval. Please try again.',
          severity: 'error'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Enter edit mode (manual entry, allow canceling)
      setIsEditMode(true);
      setCanCancelEdit(true);
    }
  };

  const handlePlanUpdate = (updatedPlan: Term[]) => {
    setCurrentPlanData(updatedPlan);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleCancelEdit = () => {
    // Show confirmation dialog before canceling
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    // Exit edit mode without saving changes
    console.log('Canceling edit mode...');
    setIsEditMode(false);
    setIsCancelDialogOpen(false);
    setCanCancelEdit(true); // Reset to allow canceling again
  };

  const handleCloseCancelDialog = () => {
    setIsCancelDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handlePlanCreated = (aiGeneratedPlan: Term[]) => {
    console.log('🎯 AI plan created, activating edit mode:', aiGeneratedPlan);
    
    // Update the current plan data with the AI-generated plan
    setCurrentPlanData(aiGeneratedPlan);
    
    // Automatically activate edit mode
    setIsEditMode(true);
    
    // Disable cancel edit since this is an AI-generated plan that requires approval
    setCanCancelEdit(false);
    
    // Close the create plan dialog
    setIsDialogOpen(false);
    
    // Show success notification
    setNotification({
      open: true,
      message: 'AI has created your graduation plan! Review and submit for approval.',
      severity: 'success'
    });
  };

  if (!user) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <div>Please log in to view your graduation plan.</div>
      </Box>
    );
  }

  if (!studentRecord) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <Typography variant="h4" gutterBottom>
          Graduation Plan
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Student record not found. User ID: {user.id}
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }}>
          Create Student Profile
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {gradPlanRecord && (
            <Button 
              variant="contained" 
              color="success"
              onClick={handleCreatePlan}
              sx={{
                backgroundColor: 'var(--primary)',
                '&:hover': {
                  backgroundColor: 'var(--hover-green)'
                }
              }}
            >
                <PlusIcon style={{ marginRight: 2 }} />
              Create New Grad Plan
            </Button>
          )}
          
          {gradPlanRecord && (
            <>
              <Button 
                variant={isEditMode ? "contained" : "outlined"}
                color={isEditMode ? "warning" : "primary"}
                onClick={handleEditPlan}
                disabled={isSubmitting}
                sx={{
                  ...(isEditMode ? {
                    backgroundColor: 'var(--action-edit)',
                    '&:hover': {
                      backgroundColor: 'var(--action-edit-hover)'
                    }
                  } : {
                    borderColor: 'var(--action-info)',
                    color: 'var(--action-info)',
                    '&:hover': {
                      borderColor: 'var(--action-info-hover)',
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    }
                  })
                }}
              >
                {isSubmitting ? 'Submitting...' : (isEditMode ? 'Submit for Approval' : 'Edit Current Grad Plan')}
              </Button>
              
              {isEditMode && (
                <Button 
                  variant="outlined"
                  color="error"
                  onClick={handleCancelEdit}
                  disabled={!canCancelEdit}
                  sx={{
                    borderColor: canCancelEdit ? 'var(--action-cancel)' : 'action.disabled',
                    color: canCancelEdit ? 'var(--action-cancel)' : 'action.disabled',
                    '&:hover': canCancelEdit ? {
                      borderColor: 'var(--action-cancel-hover)',
                      backgroundColor: 'rgba(244, 67, 54, 0.04)'
                    } : {},
                    '&:disabled': {
                      borderColor: 'action.disabled',
                      color: 'action.disabled'
                    }
                  }}
                >
                  {canCancelEdit ? 'Cancel Edit' : 'Submit Required'}
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
      
      {gradPlanRecord ? (
        <Box>
          <GraduationPlanner 
            plan={gradPlanRecord} 
            isEditMode={isEditMode} 
            onPlanUpdate={handlePlanUpdate}
          />
        </Box>
      ) : (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 6,
            px: 4,
            backgroundColor: 'grey.50',
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'grey.300'
          }}
        >
          <Typography variant="h5" gutterBottom className="font-header" sx={{ color: 'text.primary' }}>
            Welcome to Your Graduation Planner!
          </Typography>
          <Typography variant="body1" className="font-body-medium" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            You don&apos;t have a graduation plan yet. Let&apos;s create one! Our AI assistant can help you build
            a personalized graduation plan based on your major, interests, and graduation requirements.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              color="success"
              size="large"
              onClick={handleCreatePlan}
              sx={{
                backgroundColor: 'var(--primary)',
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
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
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
      />
      
      <Dialog
        open={isCancelDialogOpen}
        onClose={handleCloseCancelDialog}
        aria-labelledby="cancel-edit-dialog-title"
        aria-describedby="cancel-edit-dialog-description"
      >
        <DialogTitle id="cancel-edit-dialog-title">
          Cancel Edit Mode?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-edit-dialog-description">
            Are you sure you want to cancel edit mode? All unsaved changes to your graduation plan will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} color="primary">
            Continue Editing
          </Button>
          <Button onClick={handleConfirmCancel} color="error" variant="contained">
            Cancel Changes
          </Button>
        </DialogActions>
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
