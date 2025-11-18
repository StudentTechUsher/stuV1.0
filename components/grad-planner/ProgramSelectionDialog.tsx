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
import { Sparkles } from 'lucide-react';
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
  isGraduateStudent: boolean;
  graduateProgramIds: string[];
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
  const [studentType, setStudentType] = useState<'undergraduate' | 'graduate'>('undergraduate');
  const [majors, setMajors] = useState<ProgramOption[]>([]);
  const [minors, setMinors] = useState<ProgramOption[]>([]);
  const [graduatePrograms, setGraduatePrograms] = useState<ProgramOption[]>([]);
  const [genEds, setGenEds] = useState<ProgramOption[]>([]);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [loadingGraduatePrograms, setLoadingGraduatePrograms] = useState(false);
  const [loadingGenEds, setLoadingGenEds] = useState(false);
  const [loadingStudentTypes, setLoadingStudentTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableStudentTypes, setAvailableStudentTypes] = useState<{
    hasUndergraduate: boolean;
    hasGraduate: boolean;
  } | null>(null);

  const [selectedMajors, setSelectedMajors] = useState<ProgramOption[]>([]);
  const [selectedMinors, setSelectedMinors] = useState<ProgramOption[]>([]);
  const [selectedGraduatePrograms, setSelectedGraduatePrograms] = useState<ProgramOption[]>([]);
  const [genEdStrategy, setGenEdStrategy] = useState<'early' | 'balanced'>('balanced');
  const [planMode, setPlanMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [planName, setPlanName] = useState('');

  // Fetch available student types when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchStudentTypes = async () => {
      setLoadingStudentTypes(true);
      try {
        const response = await fetch(`/api/programs/student-types?universityId=${universityId}`);
        if (!response.ok) throw new Error('Failed to fetch student types');
        const data = await response.json();
        setAvailableStudentTypes(data);

        // Auto-select student type if only one is available
        if (data.hasUndergraduate && !data.hasGraduate) {
          setStudentType('undergraduate');
        } else if (data.hasGraduate && !data.hasUndergraduate) {
          setStudentType('graduate');
        }
      } catch (err) {
        console.error('Error fetching student types:', err);
        setError('Failed to load available programs. Please try again.');
      } finally {
        setLoadingStudentTypes(false);
      }
    };

    fetchStudentTypes();
  }, [open, universityId]);

  // Fetch programs when dialog opens or student type changes
  useEffect(() => {
    if (!open || !availableStudentTypes) return;

    const fetchPrograms = async () => {
      setError(null);

      if (studentType === 'undergraduate') {
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
      } else {
        // Graduate student - fetch graduate programs
        setLoadingGraduatePrograms(true);
        try {
          const gradRes = await fetch(`/api/programs?type=graduate_no_gen_ed&universityId=${universityId}`);
          if (!gradRes.ok) throw new Error('Failed to fetch graduate programs');
          const gradData = await gradRes.json();
          setGraduatePrograms(gradData);
        } catch (err) {
          console.error('Error fetching graduate programs:', err);
          setError('Failed to load graduate programs. Please try again.');
        } finally {
          setLoadingGraduatePrograms(false);
        }
      }
    };

    fetchPrograms();
  }, [open, universityId, studentType, availableStudentTypes]);

  const handleNext = () => {
    if (studentType === 'undergraduate' && selectedMajors.length === 0) {
      setError('Please select at least one major');
      return;
    }

    if (studentType === 'graduate' && selectedGraduatePrograms.length === 0) {
      setError('Please select at least one graduate program');
      return;
    }

    const nameValidation = validatePlanName(planName, { allowEmpty: true });
    if (!nameValidation.isValid) {
      setError(nameValidation.error);
      return;
    }

    onNext({
      majorIds: studentType === 'undergraduate' ? selectedMajors.map(m => m.id) : [],
      minorIds: studentType === 'undergraduate' ? selectedMinors.map(m => m.id) : [],
      genEdIds: studentType === 'undergraduate' ? genEds.map(g => g.id) : [], // No GenEd for graduate students
      genEdStrategy,
      planMode,
      planName: nameValidation.sanitizedValue,
      isGraduateStudent: studentType === 'graduate',
      graduateProgramIds: studentType === 'graduate' ? selectedGraduatePrograms.map(p => p.id) : []
    });
  };

  const handleClose = () => {
    // Reset selections on close
    setStudentType('undergraduate');
    setSelectedMajors([]);
    setSelectedMinors([]);
    setSelectedGraduatePrograms([]);
    setGenEdStrategy('balanced');
    setPlanMode('AUTO');
    setError(null);
    setPlanName('');
    setAvailableStudentTypes(null);
    onClose();
  };

  const isLoading = loadingMajors || loadingMinors || loadingGenEds || loadingGraduatePrograms || loadingStudentTypes;
  const canProceed = (
    (studentType === 'undergraduate' && selectedMajors.length > 0) ||
    (studentType === 'graduate' && selectedGraduatePrograms.length > 0)
  ) && !isLoading;

  // Determine if we should show the student type toggle
  const showStudentTypeToggle = availableStudentTypes?.hasUndergraduate && availableStudentTypes?.hasGraduate;

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

          {/* Student Type Selection */}
          {showStudentTypeToggle ? (
            <Box>
              <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
                Student Type
              </Typography>
              <ToggleButtonGroup
                value={studentType}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    setStudentType(value);
                    // Clear selections when switching types
                    setSelectedMajors([]);
                    setSelectedMinors([]);
                    setSelectedGraduatePrograms([]);
                    setError(null);
                  }
                }}
                fullWidth
                sx={{ mb: 1 }}
              >
                <ToggleButton value="undergraduate" className="font-body-semi">
                  Undergraduate
                </ToggleButton>
                <ToggleButton value="graduate" className="font-body-semi">
                  Graduate
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" className="font-body" color="text.secondary">
                {studentType === 'undergraduate'
                  ? 'Undergraduate programs include majors, minors, and general education requirements'
                  : 'Graduate programs (Masters, PhD, etc.) do not include general education requirements'
                }
              </Typography>
            </Box>
          ) : availableStudentTypes && (
            <Box>
              <Typography variant="subtitle1" className="font-header-bold" gutterBottom>
                Student Type
              </Typography>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body2" className="font-body-semi">
                  {studentType === 'undergraduate' ? 'Undergraduate' : 'Graduate'}
                </Typography>
                <Typography variant="caption" className="font-body" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {studentType === 'undergraduate'
                    ? 'Undergraduate programs include majors, minors, and general education requirements'
                    : 'Graduate programs (Masters, PhD, etc.) do not include general education requirements'
                  }
                </Typography>
              </Box>
            </Box>
          )}

          {/* Undergraduate Programs */}
          {studentType === 'undergraduate' && (
            <>
              {/* Majors Selection */}
              <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" className="font-header-bold">
                Select Majors (1-3 required)
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Sparkles size={14} />}
                onClick={() => {
                  // TODO: Implement major finder
                  console.log('Help me find one clicked');
                }}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1,
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'var(--hover-green)',
                    backgroundColor: 'var(--primary-15)',
                  },
                }}
              >
                Help me find one
              </Button>
            </Box>
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
            </>
          )}

          {/* Graduate Programs */}
          {studentType === 'graduate' && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" className="font-header-bold">
                  Select Graduate Program (1 required)
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Sparkles size={14} />}
                  onClick={() => {
                    // TODO: Implement graduate program finder
                    console.log('Help me find one clicked - graduate');
                  }}
                  sx={{
                    fontSize: '0.75rem',
                    py: 0.25,
                    px: 1,
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'var(--hover-green)',
                      backgroundColor: 'var(--primary-15)',
                    },
                  }}
                >
                  Help me find one
                </Button>
              </Box>
              <Autocomplete
                options={graduatePrograms}
                getOptionLabel={(option) => option.name}
                value={selectedGraduatePrograms[0] || null}
                onChange={(_, newValue) => {
                  setSelectedGraduatePrograms(newValue ? [newValue] : []);
                  setError(null);
                }}
                loading={loadingGraduatePrograms}
                disabled={isLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search for graduate programs..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingGraduatePrograms ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Typography variant="caption" className="font-body" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Graduate programs do not include general education requirements
              </Typography>
            </Box>
          )}

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
