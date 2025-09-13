'use client';
import type { ProgramRow } from '@/types/program';
import { updateProgram } from '@/lib/api/client-actions';
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React from 'react';


export type EditRequirementsDialogProps = {
    open: boolean;
    row: ProgramRow | null;
    onClose: () => void;
    onSave: (updatedProgram: ProgramRow) => Promise<void> | void;
};

interface FormData {
    id: string;
    university_id: number;
    name: string;
    program_type: string;
    version: string | number | null;
    created_at: string;
    modified_at: string | null;
    requirements: string; // JSON as string for editing
}

export default function EditRequirementsDialog({ open, row, onClose, onSave }: EditRequirementsDialogProps) {
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
    const [isJsonValid, setIsJsonValid] = React.useState(true);

    // Update form data when row changes
    React.useEffect(() => {
        if (!row) { 
            setFormData({
                id: '',
                university_id: 0,
                name: '',
                program_type: '',
                version: null,
                created_at: '',
                modified_at: null,
                requirements: ''
            });
            return; 
        }

        try {
            let requirementsText = '';
            if (typeof row.requirements === 'string') {
                try { 
                    requirementsText = JSON.stringify(JSON.parse(row.requirements), null, 2); 
                } catch { 
                    requirementsText = row.requirements; 
                }
            } else {
                requirementsText = JSON.stringify(row.requirements, null, 2);
            }

            setFormData({
                id: row.id,
                university_id: row.university_id,
                name: row.name,
                program_type: row.program_type,
                version: row.version,
                created_at: row.created_at,
                modified_at: row.modified_at,
                requirements: requirementsText
            });
        } catch {
            setFormData({
                id: row.id,
                university_id: row.university_id,
                name: row.name,
                program_type: row.program_type,
                version: row.version,
                created_at: row.created_at,
                modified_at: row.modified_at,
                requirements: String(row.requirements ?? '')
            });
        }
        setValidationErrors({});
        setIsJsonValid(true);
    }, [row]);

    // Handle field changes
    const handleFieldChange = (field: keyof FormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }

        // Special validation for requirements JSON
        if (field === 'requirements' && typeof value === 'string') {
            try {
                JSON.parse(value);
                setIsJsonValid(true);
            } catch {
                setIsJsonValid(false);
            }
        }
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

        if (formData.requirements.trim()) {
            try {
                JSON.parse(formData.requirements);
            } catch {
                errors.requirements = 'Requirements must be valid JSON or empty';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            let requirementsValue: unknown = formData.requirements;
            try { 
                requirementsValue = JSON.parse(formData.requirements); 
            } catch { 
                // allow plain text
            }

            // Prepare the updates (excluding id and created_at which shouldn't change)
            const updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>> = {
                name: formData.name,
                program_type: formData.program_type,
                version: formData.version,
                requirements: requirementsValue,
                // modified_at will be set automatically by updateProgram
            };

            // Call the API to update the program
            const updatedProgram = await updateProgram(formData.id, updates);
            
            // Call the parent's onSave callback with the updated program
            await onSave(updatedProgram);
            
            // Close the dialog
            onClose();
        } catch (error) {
            console.error('Failed to update program:', error);
            // You might want to show an error message to the user here
            // For now, we'll just log the error
        }
    };

    const programTypes = ['major', 'minor', 'emphasis', 'general_education'];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Typography variant="h5">Edit Program</Typography>
                <Typography variant="subtitle2" color="text.secondary">
                    {row?.name} ({row?.program_type})
                </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
                <Box sx={{ p: 2 }}>
                    {/* Basic Information Section */}
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
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
                                        handleFieldChange('version', val === '' ? null : isNaN(numVal) ? val : numVal);
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

                    {/* Requirements Section */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">
                                Program Requirements {!isJsonValid && '⚠️ Invalid JSON'}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <TextField
                                label="Requirements (JSON or text)"
                                value={formData.requirements}
                                onChange={(e) => handleFieldChange('requirements', e.target.value)}
                                fullWidth
                                multiline
                                minRows={15}
                                maxRows={25}
                                error={!!validationErrors.requirements || !isJsonValid}
                                helperText={
                                    validationErrors.requirements || 
                                    (!isJsonValid ? 'Invalid JSON format' : 'Enter requirements as JSON or plain text')
                                }
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }
                                }}
                            />
                            
                            {formData.requirements.trim() && isJsonValid && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        JSON Preview:
                                    </Typography>
                                    <Box sx={{ 
                                        bgcolor: 'background.paper', 
                                        p: 2, 
                                        borderRadius: 1, 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        maxHeight: '300px',
                                        overflow: 'auto'
                                    }}>
                                        <pre style={{ 
                                            margin: 0, 
                                            fontSize: '0.75rem', 
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word'
                                        }}>
                                            {JSON.stringify(JSON.parse(formData.requirements), null, 2)}
                                        </pre>
                                    </Box>
                                </Box>
                            )}
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ gap: 1, p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={!isJsonValid || Object.keys(validationErrors).length > 0}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}