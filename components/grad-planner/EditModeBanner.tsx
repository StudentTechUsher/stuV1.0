import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import SaveIcon from '@mui/icons-material/Save';
import { Term, Event } from './types';

interface EditModeBannerProps {
  editablePlanData: Term[];
  events: Event[];
  onSave?: (updatedPlan: Term[], events: Event[]) => void;
  role?: 'student' | 'advisor';
}

export function EditModeBanner({ editablePlanData, events, onSave, role = 'student' }: EditModeBannerProps) {
  const instruction = role === 'advisor'
    ? 'Make changes to this graduation plan. Click "Approve Plan" or "Save Changes and Notify Student" when review is complete.'
    : 'Make changes to this graduation plan. Click "Submit for Approval" when finished.';
  return (
    <Box sx={{
      mb: 3,
      p: 2,
      backgroundColor: 'rgba(255, 165, 0, 0.15)',
      borderRadius: 3,
      border: '2px solid var(--action-edit)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      boxShadow: '0 2px 8px rgba(255, 165, 0, 0.2)'
    }}>
      <Box>
        <Typography variant="h6" className="font-header-bold" sx={{ color: 'var(--action-edit)' }}>
          Edit Mode Active
        </Typography>
        <Typography variant="body2" className="font-body" color="text.secondary">{instruction}</Typography>
      </Box>
      {onSave && (
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => onSave(editablePlanData, events)}
          className="font-body-semi"
          sx={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'var(--hover-green)'
            }
          }}
        >
          Save
        </Button>
      )}
    </Box>
  );
}
