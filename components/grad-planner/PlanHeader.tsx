import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import { Term } from './types';

interface PlanHeaderProps {
  currentPlanData: Term[];
  durationYears?: number;
  isEditMode: boolean;
  isSpaceView: boolean;
  onToggleView: () => void;
  onAddEvent: () => void;
}

export function PlanHeader({
  currentPlanData,
  durationYears,
  isEditMode,
  isSpaceView,
  onToggleView,
  onAddEvent
}: PlanHeaderProps) {
  const totalCredits = currentPlanData.reduce((total, term) => {
    const termCredits = term.credits_planned ||
                       (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
    return total + termCredits;
  }, 0);

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body1" className="font-body">
          Terms Planned: <Box component="span" sx={{ fontWeight: 'bold' }}>{currentPlanData.length}</Box>
        </Typography>
        {Boolean(durationYears) && (
          <Typography variant="body1" className="font-body">
            {durationYears} years
          </Typography>
        )}
        <Typography variant="body1" className="font-body">
          Total Credits: <Box component="span" sx={{ fontWeight: 'bold' }}>{totalCredits}</Box>
        </Typography>
      </Box>

      {/* View Mode Toggle and Add Event Button */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {isEditMode && (
          <Button
            variant="contained"
            onClick={onAddEvent}
            startIcon={<AddIcon />}
            className="font-body-semi"
            sx={{
              backgroundColor: '#1A1A1A',
              color: 'white',
              '&:hover': {
                backgroundColor: '#000000',
              }
            }}
          >
            Add Event
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={onToggleView}
          startIcon={isSpaceView ? <ZoomInMapIcon /> : <ZoomOutMapIcon />}
          className="font-body-semi"
          sx={{
            borderColor: '#1A1A1A',
            color: '#1A1A1A',
            '&:hover': {
              borderColor: '#000000',
              backgroundColor: 'rgba(26, 26, 26, 0.08)',
            }
          }}
        >
          {isSpaceView ? 'Detail View' : 'Zoom Out'}
        </Button>
      </Box>
    </Box>
  );
}
