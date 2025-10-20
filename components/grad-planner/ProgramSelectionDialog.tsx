'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import { GetGenEdsForUniversity } from '@/lib/services/programService';
import { validatePlanName } from '@/lib/utils/plan-name-validation';

interface ProgramOption {
  id: string;
  name: string;
  program_type: string;
}

export interface ProgramSelections {
  majorIds: string[];
  minorIds: string[];
  genEdIds: string[];
  genEdStrategy: 'early' | 'balanced';
  planMode: 'AUTO' | 'MANUAL';
  planName: string;
}

interface ProgramSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (selections: ProgramSelections) => void;
  universityId: number;
}

export default function ProgramSelectionDialog({
  open,
  onClose,
  onNext,
  universityId
}: Readonly<ProgramSelectionDialogProps>) {
  const [majors, setMajors] = useState<ProgramOption[]>([]);
  const [minors, setMinors] = useState<ProgramOption[]>([]);
  const [genEds, setGenEds] = useState<ProgramOption[]>([]);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [loadingGenEds, setLoadingGenEds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedMajors, setSelectedMajors] = useState<ProgramOption[]>([]);
  const [selectedMinors, setSelectedMinors] = useState<ProgramOption[]>([]);
  const [genEdStrategy, setGenEdStrategy] = useState<'early' | 'balanced'>('balanced');
  const [planMode, setPlanMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [planName, setPlanName] = useState('');
  const [planNameError, setPlanNameError] = useState<string | null>(null);

  // Fetch majors and minors when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchPrograms = async () => {
      setError(null);

      // Fetch majors
      setLoadingMajors(true);
      try {
        const majorsRes = await fetch(`/api/programs?type=major&universityId=${universityId}`);
        if (!majorsRes.ok) throw new Error('Failed to fetch majors');
        const majorsData = await majorsRes.json();
        setMajors(majorsData);
      } catch (err) {
        console.error('Error fetching majors:', err);
        setError('Failed to load majors. Please try again.');
      } finally {
        setLoadingMajors(false);
      }

      // Fetch minors
      setLoadingMinors(true);
      try {
        const minorsRes = await fetch(`/api/programs?type=minor&universityId=${universityId}`);
        if (!minorsRes.ok) throw new Error('Failed to fetch minors');
        const minorsData = await minorsRes.json();
        setMinors(minorsData);
      } catch (err) {
        console.error('Error fetching minors:', err);
        setError('Failed to load minors. Please try again.');
      } finally {
        setLoadingMinors(false);
      }

      // Fetch GenEd programs using service function
      setLoadingGenEds(true);
      try {
        const genEdPrograms = await GetGenEdsForUniversity(universityId);
        setGenEds(genEdPrograms.map(p => ({
          id: p.id,
          name: p.name,
          program_type: p.program_type || 'general_ed'
        })));
      } catch (err) {
        console.error('Error fetching GenEd programs:', err);
        setError('Failed to load general education programs. Please try again.');
      } finally {
        setLoadingGenEds(false);
      }
    };

    fetchPrograms();
  }, [open, universityId]);

  const handleNext = () => {
    if (selectedMajors.length === 0) {
      setError('Please select at least one major');
      return;
    }

    const nameValidation = validatePlanName(planName, { allowEmpty: true });
    if (!nameValidation.isValid) {
      setPlanNameError(nameValidation.error);
      return;
    }
    setPlanNameError(null);

    onNext({
      majorIds: selectedMajors.map(m => m.id),
      minorIds: selectedMinors.map(m => m.id),
      genEdIds: genEds.map(g => g.id), // Include all GenEd programs for the university
      genEdStrategy,
      planMode,
      planName: nameValidation.sanitizedValue
    });
  };

  const handleClose = () => {
    // Reset selections on close
    setSelectedMajors([]);
    setSelectedMinors([]);
    setGenEdStrategy('balanced');
    setPlanMode('AUTO');
    setError(null);
    setPlanName('');
    setPlanNameError(null);
    onClose();
  };

  const isLoading = loadingMajors || loadingMinors || loadingGenEds;
  const canProceed = selectedMajors.length > 0 && !isLoading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon sx={{ color: 'var(--primary)' }} />
          <Typography variant="h5" className="font-header-bold">
            Create Graduation Plan
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Step indicator */}
          <Typography variant="body2" className="font-body" color="text.secondary">
            Step 1 of 2: Select Your Programs
          </Typography>

          {error && (
            <Box sx={{ p: 2, backgroundColor: '#ffebee', borderRadius: 2, border: '1px solid #ef5350' }}>
              <Typography variant="body2" className="font-body" color="error">
                {error}
              </Typography>
            </Box>
          )}

          {/* Majors Selection */}
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
              Select Majors (1-3 required)
            </Typography>
            <Autocomplete
              multiple
              options={majors}
              getOptionLabel={(option) => option.name}
              value={selectedMajors}
              onChange={(_, newValue) => {
                if (newValue.length <= 3) {
                  setSelectedMajors(newValue);
                  setError(null);
                }
              }}
              loading={loadingMajors}
              disabled={isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search for majors..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingMajors ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Typography variant="caption" className="font-body" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {selectedMajors.length}/3 majors selected
            </Typography>
          </Box>

          {/* Minors Selection */}
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
              Select Minors (0-3 optional)
            </Typography>
            <Autocomplete
              multiple
              options={minors}
              getOptionLabel={(option) => option.name}
              value={selectedMinors}
              onChange={(_, newValue) => {
                if (newValue.length <= 3) {
                  setSelectedMinors(newValue);
                }
              }}
              loading={loadingMinors}
              disabled={isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search for minors..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingMinors ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Typography variant="caption" className="font-body" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {selectedMinors.length}/3 minors selected
            </Typography>
          </Box>

          {/* GenEd Strategy */}
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
              General Education Strategy
            </Typography>
            <ToggleButtonGroup
              value={genEdStrategy}
              exclusive
              onChange={(_, value) => value && setGenEdStrategy(value)}
              fullWidth
              sx={{ mb: 1 }}
            >
              <ToggleButton value="early" className="font-body-semi">
                Early Focus
              </ToggleButton>
              <ToggleButton value="balanced" className="font-body-semi">
                Balanced
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" className="font-body" color="text.secondary">
              {genEdStrategy === 'early'
                ? 'Complete general education courses early to focus on major courses later'
                : 'Balance general education and major courses throughout your plan'
              }
            </Typography>
          </Box>

          {/* Plan Mode */}
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
              Plan Creation Mode
            </Typography>
            <ToggleButtonGroup
              value={planMode}
              exclusive
              onChange={(_, value) => value && setPlanMode(value)}
              fullWidth
              sx={{ mb: 1 }}
            >
              <ToggleButton value="AUTO" className="font-body-semi">
                <AutoAwesomeIcon sx={{ mr: 1 }} fontSize="small" />
                Auto
              </ToggleButton>
              <ToggleButton value="MANUAL" className="font-body-semi">
                <EditIcon sx={{ mr: 1 }} fontSize="small" />
                Manual
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" className="font-body" color="text.secondary">
              {planMode === 'AUTO'
                ? 'AI will automatically select courses and create your plan'
                : 'Manually select courses from requirements before generating plan'
              }
            </Typography>
          </Box>

          {/* Plan Name */}
          <Box>
            <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
              Plan Name (optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="Ex: Biomedical Engineering Roadmap"
              value={planName}
              onChange={(event) => {
                setPlanName(event.target.value);
                if (planNameError) {
                  setPlanNameError(null);
                }
              }}
              error={Boolean(planNameError)}
              helperText={planNameError ?? 'You can rename your plan at any time from the dashboard.'}
              inputProps={{ maxLength: 100 }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} className="font-body-semi">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!canProceed}
          className="font-body-semi"
          sx={{
            backgroundColor: 'var(--primary)',
            '&:hover': { backgroundColor: 'var(--hover-green)' }
          }}
        >
          Next
        </Button>
      </DialogActions>
    </Dialog>
  );
}
