'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';
import type { ProgramRequirementsStructure } from '@/types/programRequirements';
import { updateProgram } from '@/lib/services/programService';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RequirementsAuthor from './requirements-author';

export interface EditProgramPageProps {
  program: ProgramRow;
}

interface FormData {
  name: string;
  program_type: string;
  version: string | number | null;
  requirements: ProgramRequirementsStructure | string;
}

export default function EditProgramPage({ program }: Readonly<EditProgramPageProps>) {
  const router = useRouter();
  const [formData, setFormData] = React.useState<FormData>({
    name: program.name,
    program_type: program.program_type,
    version: program.version,
    requirements: (program.requirements && typeof program.requirements === 'object' && Object.keys(program.requirements).length > 0)
      ? program.requirements as ProgramRequirementsStructure
      : ''
  });

  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFieldChange = (field: keyof FormData, value: string | number | null | ProgramRequirementsStructure) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleRequirementsChange = (requirements: ProgramRequirementsStructure) => {
    setFormData(prev => ({ ...prev, requirements }));
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
      const updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>> = {
        name: formData.name,
        program_type: formData.program_type,
        version: formData.version,
        requirements: formData.requirements,
      };

      await updateProgram(program.id, updates);

      setSnackbarSeverity('success');
      setSnackbarMessage('Program updated successfully');
      setSnackbarOpen(true);

      // Navigate back after success
      setTimeout(() => {
        router.push('/maintain-programs');
      }, 1000);
    } catch (error) {
      console.error('Failed to save program:', error);
      setSnackbarSeverity('error');
      setSnackbarMessage('Failed to save program. Please try again.');
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

  const programTypes = ['major', 'minor', 'emphasis', 'general_education'];

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
                Edit Program
              </h1>
              <p className="font-body text-sm text-[var(--muted-foreground)]">
                {program.name} ({program.program_type})
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
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Basic Information Card */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <Typography variant="h6" className="font-header">
                Basic Information
              </Typography>
            </div>
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 2, minWidth: '400px' }}>
                    <TextField
                      label="Program Name"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      fullWidth
                      required
                      error={!!validationErrors.name}
                      helperText={validationErrors.name}
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
                          <MenuItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                      {validationErrors.program_type && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {validationErrors.program_type}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <TextField
                      label="Version"
                      value={formData.version || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numVal = parseFloat(val);
                        let versionValue: string | number | null;
                        if (val === '') {
                          versionValue = null;
                        } else if (isNaN(numVal)) {
                          versionValue = val;
                        } else {
                          versionValue = numVal;
                        }
                        handleFieldChange('version', versionValue);
                      }}
                      fullWidth
                      helperText="Enter version number or text"
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <TextField
                      label="Created At"
                      value={new Date(program.created_at).toLocaleString()}
                      disabled
                      fullWidth
                      helperText="Auto-generated"
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '200px' }}>
                    <TextField
                      label="Last Modified"
                      value={program.modified_at ? new Date(program.modified_at).toLocaleString() : 'Never'}
                      disabled
                      fullWidth
                      helperText="Auto-updated on save"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </div>

          {/* Requirements Card */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <Typography variant="h6" className="font-header">
                Program Requirements
              </Typography>
            </div>
            <Box sx={{ p: 4 }}>
              <RequirementsAuthor
                initialRequirements={formData.requirements}
                onChange={handleRequirementsChange}
              />
            </Box>
          </div>
        </div>
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
