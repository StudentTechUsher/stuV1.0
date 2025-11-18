'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';
import type { ProgramRequirementsStructure, ProgramRequirement } from '@/types/programRequirements';
import { createProgram } from '@/lib/services/programService';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RequirementForm from './requirement-form';
import RequirementView from './requirement-view';

export interface NewProgramFormProps {
  universityId: number;
}

export default function NewProgramForm({ universityId }: Readonly<NewProgramFormProps>) {
  const router = useRouter();

  const [formData, setFormData] = React.useState({
    name: '',
    program_type: 'major',
    version: '1.0',
    target_total_credits: null as number | null
  });

  const [requirements, setRequirements] = React.useState<ProgramRequirement[]>([]);
  const [editingRequirementId, setEditingRequirementId] = React.useState<number | string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Compute is_general_ed based on program_type
  const is_general_ed = formData.program_type === 'general_education';

  const handleAddRequirement = () => {
    const newId = requirements.length > 0
      ? Math.max(...requirements.map(r => typeof r.requirementId === 'number' ? r.requirementId : 0)) + 1
      : 1;

    const newRequirement: ProgramRequirement = {
      requirementId: newId,
      description: 'New Requirement',
      type: 'allOf',
      courses: []
    };

    setRequirements(prev => [...prev, newRequirement]);
    setEditingRequirementId(newId);
  };

  const handleDeleteRequirement = (requirementId: number | string) => {
    setRequirements(prev => prev.filter(r => r.requirementId !== requirementId));
  };

  const handleUpdateRequirement = (updatedRequirement: ProgramRequirement) => {
    setRequirements(prev =>
      prev.map(r => r.requirementId === updatedRequirement.requirementId ? updatedRequirement : r)
    );
    setEditingRequirementId(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Program name is required';
    }

    if (!formData.program_type.trim()) {
      errors.program_type = 'Program type is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const requirementsStructure: ProgramRequirementsStructure = {
        programRequirements: requirements,
        metadata: {
          version: '1.0',
          lastModified: new Date().toISOString(),
          totalMinCredits: requirements.reduce((sum, req) => {
            if ('courses' in req && req.courses) {
              return sum + req.courses.reduce((courseSum, course) => courseSum + course.credits, 0);
            }
            return sum;
          }, 0)
        }
      };

      const newProgramData: Omit<ProgramRow, 'id' | 'created_at' | 'modified_at'> = {
        university_id: universityId,
        name: formData.name,
        program_type: formData.program_type,
        version: formData.version,
        requirements: requirementsStructure,
        is_general_ed,
        ...(formData.target_total_credits !== null && { target_total_credits: formData.target_total_credits })
      };

      await createProgram(newProgramData);

      setSnackbarSeverity('success');
      setSnackbarMessage('Program created successfully');
      setSnackbarOpen(true);

      setTimeout(() => {
        router.push('/maintain-programs');
      }, 1000);
    } catch (error) {
      console.error('Failed to create program:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to create program. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/maintain-programs');
  };

  const handleSnackbarClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const programTypes = [
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: 'emphasis', label: 'Emphasis' },
    { value: 'general_education', label: 'General Education' },
    { value: 'graduate_no_gen_ed', label: 'Graduate (Masters/Doctoral)' }
  ];

  const getRequirementSummary = (req: ProgramRequirement): string => {
    // Count courses recursively
    const countCourses = (r: ProgramRequirement): number => {
      let count = 0;
      if ('courses' in r && r.courses) {
        count += r.courses.length;
      }
      if ('subRequirements' in r && r.subRequirements) {
        count += r.subRequirements.reduce((sum, sub) => sum + countCourses(sub), 0);
      }
      if ('subrequirements' in r && r.subrequirements) {
        count += r.subrequirements.reduce((sum, sub) => sum + countCourses(sub), 0);
      }
      return count;
    };

    const courseCount = countCourses(req);

    if ('subRequirements' in req && req.subRequirements) {
      return `${req.subRequirements.length} sub-requirement${req.subRequirements.length !== 1 ? 's' : ''}, ${courseCount} total course${courseCount !== 1 ? 's' : ''}`;
    }
    if ('subrequirements' in req && req.subrequirements) {
      return `${req.subrequirements.length} sub-requirement${req.subrequirements.length !== 1 ? 's' : ''}, ${courseCount} total course${courseCount !== 1 ? 's' : ''}`;
    }
    if ('steps' in req && req.steps) {
      return `${req.steps.length} step${req.steps.length !== 1 ? 's' : ''}`;
    }
    if (courseCount > 0) {
      return `${courseCount} course${courseCount !== 1 ? 's' : ''}`;
    }
    return 'Empty';
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-white transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]"
              aria-label="Back to programs"
            >
              <ArrowBackIcon />
            </button>
            <div>
              <h1 className="font-header text-2xl font-bold text-[var(--foreground)]">
                Create New Program
              </h1>
              <p className="font-body text-sm text-[var(--muted-foreground)]">
                Define a new academic program with requirements
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outlined"
              onClick={handleCancel}
              sx={{
                color: 'text.secondary',
                borderColor: 'var(--border)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  borderColor: 'var(--border)'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || Object.keys(validationErrors).length > 0}
              startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{
                backgroundColor: '#12F987',
                color: '#0A0A0A',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#0ed676'
                },
                '&:disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)'
                }
              }}
            >
              {isSaving ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Start by filling out the basic information below, then add requirements to define the program structure.
          </Typography>
        </Alert>

        {/* Basic Information */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <Typography variant="h6" className="font-header">
              Basic Information
            </Typography>
          </div>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 2, minWidth: '300px' }}>
                  <TextField
                    label="Program Name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    fullWidth
                    required
                    error={!!validationErrors.name}
                    helperText={validationErrors.name || 'e.g., Information Systems (BSIS)'}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: '200px' }}>
                  <FormControl fullWidth error={!!validationErrors.program_type}>
                    <InputLabel>Program Type</InputLabel>
                    <Select
                      value={formData.program_type}
                      label="Program Type"
                      onChange={(e) => handleFieldChange('program_type', e.target.value)}
                    >
                      {programTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: '150px' }}>
                  <TextField
                    label="Version"
                    value={formData.version || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const numVal = parseFloat(val);
                      handleFieldChange('version', val === '' ? null : isNaN(numVal) ? val : numVal);
                    }}
                    fullWidth
                    helperText="e.g., 1.0, 2.1"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: '150px' }}>
                  <TextField
                    label="Target Total Credits"
                    type="number"
                    value={formData.target_total_credits || ''}
                    onChange={(e) => handleFieldChange('target_total_credits', e.target.value ? parseInt(e.target.value) : null)}
                    fullWidth
                    helperText="Total credits for program"
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </div>

        {/* Requirements Section */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <Typography variant="h6" className="font-header">
              Program Requirements
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddRequirement}
              size="small"
              sx={{
                backgroundColor: '#12F987',
                color: '#0A0A0A',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#0ed676'
                }
              }}
            >
              Add Requirement
            </Button>
          </div>
          <Box sx={{ p: 3 }}>
            {requirements.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No requirements added yet.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click "Add Requirement" to define the program structure with courses and sub-requirements.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {requirements.map((requirement) => (
                  <Accordion key={requirement.requirementId}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Chip
                          label={requirement.requirementId}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography sx={{ flex: 1, fontWeight: 500 }}>
                          {requirement.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getRequirementSummary(requirement)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => setEditingRequirementId(requirement.requirementId)}
                          sx={{
                            backgroundColor: '#12F987',
                            color: '#0A0A0A',
                            fontWeight: 600,
                            '&:hover': {
                              backgroundColor: '#0ed676'
                            }
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteRequirement(requirement.requirementId)}
                          sx={{
                            color: 'error.main',
                            borderColor: 'error.main',
                            '&:hover': {
                              backgroundColor: 'rgba(211, 47, 47, 0.04)',
                              borderColor: 'error.dark'
                            }
                          }}
                          variant="outlined"
                        >
                          Delete
                        </Button>
                      </Box>
                      <RequirementView requirement={requirement} />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </div>

        {/* Requirement Form Dialog */}
        {editingRequirementId !== null && (
          <RequirementForm
            requirement={requirements.find(r => r.requirementId === editingRequirementId)!}
            onSave={handleUpdateRequirement}
            onClose={() => setEditingRequirementId(null)}
          />
        )}
      </div>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
