'use client';
import type { ProgramRow } from '@/types/program';
import type { ProgramRequirementsStructure } from '@/types/programRequirements';
import { updateProgram, createProgram } from '@/lib/services/programService';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    TextField,
    DialogActions,
    Button,
    Box,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar,
    Alert
} from '@mui/material';
import React from 'react';
import RequirementsAuthor from './requirements-author';


export type EditRequirementsDialogProps = {
    open: boolean;
    row: ProgramRow | null;
    onClose: () => void;
    onSave: (updatedProgram: ProgramRow) => Promise<void> | void;
    university_id: number; // Add university_id for creating new programs
};

interface FormData {
    id: string;
    university_id: number;
    name: string;
    program_type: string;
    version: string | number | null;
    created_at: string;
    modified_at: string | null;
    requirements: ProgramRequirementsStructure | string; // Structured or JSON string
}

export default function EditRequirementsDialog({ open, row, onClose, onSave, university_id }: Readonly<EditRequirementsDialogProps>) {
    const [formData, setFormData] = React.useState<FormData>({
        id: '',
        university_id: 0,
        name: '',
        program_type: '',
        version: null,
        created_at: '',
        modified_at: null,
        requirements: ''
    });

    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');

    // Update form data when row changes
    React.useEffect(() => {
        if (!row) { 
            setFormData({
                id: '',
                university_id: university_id, // Use passed university_id for new programs
                name: '',
                program_type: '',
                version: null,
                created_at: '',
                modified_at: null,
                requirements: ''
            });
            return; 
        }

        // Parse requirements if they exist
        let requirementsData: ProgramRequirementsStructure | string = '';
        if (row.requirements) {
            if (typeof row.requirements === 'string') {
                requirementsData = row.requirements;
            } else {
                requirementsData = row.requirements as ProgramRequirementsStructure;
            }
        }

        setFormData({
            id: row.id,
            university_id: row.university_id,
            name: row.name,
            program_type: row.program_type,
            version: row.version,
            created_at: row.created_at,
            modified_at: row.modified_at,
            requirements: requirementsData
        });
        setValidationErrors({});
    }, [row, university_id]);

    // Handle field changes
    const handleFieldChange = (field: keyof FormData, value: string | number | null | ProgramRequirementsStructure) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // Handle requirements changes from author
    const handleRequirementsChange = (requirements: ProgramRequirementsStructure) => {
        setFormData(prev => ({ ...prev, requirements }));
    };

    // Validate form
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.name.trim()) {
            errors.name = 'Program name is required';
        }

        if (!formData.program_type.trim()) {
            errors.program_type = 'Program type is required';
        }

        // Requirements validation is handled by RequirementsAuthor component

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            // Requirements are already structured or will be handled properly
            const requirementsValue = formData.requirements;

            let resultProgram: ProgramRow;

            if (!row) {
                // Creating a new program
                const newProgramData: Omit<ProgramRow, 'id' | 'created_at' | 'modified_at'> = {
                    university_id: formData.university_id,
                    name: formData.name,
                    program_type: formData.program_type,
                    version: formData.version,
                    requirements: requirementsValue,
                };

                resultProgram = await createProgram(newProgramData);
            } else {
                // Updating an existing program
                const updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>> = {
                    name: formData.name,
                    program_type: formData.program_type,
                    version: formData.version,
                    requirements: requirementsValue,
                    // modified_at will be set automatically by updateProgram
                };

                resultProgram = await updateProgram(formData.id, updates);
            }
            
            // Call the parent's onSave callback with the result program
            await onSave(resultProgram);

            // Success feedback
            setSnackbarSeverity('success');
            setSnackbarMessage(row ? 'Program updated successfully.' : 'Program created successfully.');
            setSnackbarOpen(true);

            // Close after a short delay to allow user to see success
            setTimeout(() => {
                onClose();
            }, 400);
        } catch (error) {
            console.error('Failed to save program:', error);
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save program. Please try again.');
            setSnackbarOpen(true);
        }
    };

    const handleSnackbarClose = (_?: unknown, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const programTypes = ['major', 'minor', 'emphasis', 'general_education'];

    return (
        <>
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
              <Box>
                <Typography variant="h5" className="font-header" component="div">
                  {row ? 'Edit Program' : 'Add New Program'}
                </Typography>
                <Typography variant="subtitle2" className="font-body" color="text.secondary" component="div">
                  {row ? `${row.name} (${row.program_type})` : 'Create a new program for your university'}
                </Typography>
              </Box>
            </DialogTitle>
            
            <DialogContent dividers>
                <Box sx={{ p: 2 }}>
                    {/* Basic Information Section */}
                    <Typography variant="h6" className="font-header" gutterBottom sx={{ mb: 3 }}>
                        Basic Information
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
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
                                    value={formData.created_at ? new Date(formData.created_at).toLocaleString() : ''}
                                    disabled
                                    fullWidth
                                    helperText="Auto-generated"
                                />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                                <TextField
                                    label="Last Modified"
                                    value={formData.modified_at ? new Date(formData.modified_at).toLocaleString() : 'Never'}
                                    disabled
                                    fullWidth
                                    helperText="Auto-updated on save"
                                />
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    {/* Requirements Section - New Visual Editor */}
                    <Typography variant="h6" className="font-header" gutterBottom sx={{ mb: 2 }}>
                        Program Requirements
                    </Typography>

                    <RequirementsAuthor
                        initialRequirements={formData.requirements}
                        onChange={handleRequirementsChange}
                    />
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ gap: 1, p: 2 }}>
                <Button 
                    onClick={onClose}
                    sx={{ 
                        color: 'text.secondary',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={Object.keys(validationErrors).length > 0}
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
                    {row ? 'Save Changes' : 'Create Program'}
                </Button>
            </DialogActions>
        </Dialog>
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
        </>
    );
}