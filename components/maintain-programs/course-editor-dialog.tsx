'use client';

import * as React from 'react';
import type { Course } from '@/types/programRequirements';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material';

const TERMS = ['Fall', 'Winter', 'Spring', 'Summer'];

export interface CourseEditorDialogProps {
  course: Course | null;
  onSave: (course: Course) => void;
  onClose: () => void;
}

export default function CourseEditorDialog({
  course,
  onSave,
  onClose
}: Readonly<CourseEditorDialogProps>) {
  const [formData, setFormData] = React.useState<Course>(
    course || {
      code: '',
      title: '',
      credits: 3,
      prerequisite: 'none'
    }
  );

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleFieldChange = (field: keyof Course, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleTermsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    handleFieldChange('termsOffered', typeof value === 'string' ? value.split(',') : value);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Course code is required';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    }
    if (!formData.credits || formData.credits <= 0) {
      newErrors.credits = 'Credits must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {course ? 'Edit Course' : 'Add Course'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Course Code and Title */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Course Code"
              value={formData.code}
              onChange={(e) => handleFieldChange('code', e.target.value)}
              error={!!errors.code}
              helperText={errors.code || 'e.g., IS 201, ACC 200'}
              sx={{ flex: 1 }}
              required
            />
            <TextField
              label="Course Title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              sx={{ flex: 2 }}
              required
            />
          </Box>

          {/* Credits */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Credits"
              type="number"
              value={formData.credits}
              onChange={(e) => handleFieldChange('credits', parseFloat(e.target.value))}
              error={!!errors.credits}
              helperText={errors.credits}
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ flex: 1 }}
              required
            />
            <TextField
              label="Min Credits (Optional)"
              type="number"
              value={formData.minCredits || ''}
              onChange={(e) => handleFieldChange('minCredits', e.target.value ? parseFloat(e.target.value) : undefined)}
              helperText="For variable credit courses"
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Credits (Optional)"
              type="number"
              value={formData.maxCredits || ''}
              onChange={(e) => handleFieldChange('maxCredits', e.target.value ? parseFloat(e.target.value) : undefined)}
              helperText="For variable credit courses"
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Prerequisite */}
          <TextField
            label="Prerequisite"
            value={formData.prerequisite || ''}
            onChange={(e) => handleFieldChange('prerequisite', e.target.value)}
            helperText='e.g., "Acceptance into the BSIS" or "none"'
            fullWidth
          />

          {/* Terms Offered */}
          <FormControl fullWidth>
            <InputLabel>Terms Offered</InputLabel>
            <Select
              multiple
              value={formData.termsOffered || []}
              onChange={handleTermsChange}
              input={<OutlinedInput label="Terms Offered" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {TERMS.map((term) => (
                <MenuItem key={term} value={term}>
                  {term}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sequencing Information */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            Sequencing (Optional)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Sequence Group"
              value={formData.sequenceGroup || ''}
              onChange={(e) => handleFieldChange('sequenceGroup', e.target.value)}
              helperText='e.g., "IS Upper Division Core"'
              sx={{ flex: 2 }}
            />
            <TextField
              label="Sequence Order"
              type="number"
              value={formData.sequenceOrder || ''}
              onChange={(e) => handleFieldChange('sequenceOrder', e.target.value ? parseInt(e.target.value) : undefined)}
              helperText="1 = first block, 2 = second, etc."
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Max Repeats */}
          <TextField
            label="Max Repeats"
            type="number"
            value={formData.maxRepeats || ''}
            onChange={(e) => handleFieldChange('maxRepeats', e.target.value ? parseInt(e.target.value) : undefined)}
            helperText="1 = take once, 2 = can repeat once, etc."
            inputProps={{ min: 1 }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            backgroundColor: '#12F987',
            color: '#0A0A0A',
            '&:hover': {
              backgroundColor: '#0ed676'
            }
          }}
        >
          {course ? 'Save Changes' : 'Add Course'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
