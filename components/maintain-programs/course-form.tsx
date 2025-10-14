'use client';

import * as React from 'react';
import {
  Box,
  TextField,
  IconButton,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Typography,
  Collapse
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Course } from '@/types/programRequirements';

export interface CourseFormProps {
  course: Course;
  onChange: (course: Course) => void;
  onDelete: () => void;
  index: number;
}

export default function CourseForm({
  course,
  onChange,
  onDelete,
  index
}: Readonly<CourseFormProps>) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isVariableCredit, setIsVariableCredit] = React.useState(
    !!course.minCredits || !!course.maxCredits
  );

  const handleChange = (field: keyof Course, value: string | number | string[] | undefined) => {
    onChange({ ...course, [field]: value });
  };

  const toggleVariableCredit = (enabled: boolean) => {
    setIsVariableCredit(enabled);
    if (enabled) {
      onChange({
        ...course,
        minCredits: course.credits || 1,
        maxCredits: course.credits || 3
      });
    } else {
      const updated = { ...course };
      delete updated.minCredits;
      delete updated.maxCredits;
      onChange(updated);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 1
        }
      }}
    >
      {/* Main Course Info */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 40 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            #{index + 1}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Course Code"
              value={course.code}
              onChange={(e) => handleChange('code', e.target.value)}
              size="small"
              required
              placeholder="e.g., ACC 200"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Course Title"
              value={course.title}
              onChange={(e) => handleChange('title', e.target.value)}
              size="small"
              required
              placeholder="e.g., Principles of Accounting"
              sx={{ flex: 2 }}
            />
            {!isVariableCredit ? (
              <TextField
                label="Credits"
                type="number"
                value={course.credits}
                onChange={(e) => handleChange('credits', parseFloat(e.target.value) || 0)}
                size="small"
                required
                inputProps={{ min: 0, step: 0.5 }}
                sx={{ width: 100 }}
              />
            ) : (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Min"
                  type="number"
                  value={course.minCredits || 0}
                  onChange={(e) =>
                    handleChange('minCredits', parseFloat(e.target.value) || 0)
                  }
                  size="small"
                  inputProps={{ min: 0, step: 0.5 }}
                  sx={{ width: 70 }}
                />
                <Typography variant="body2">-</Typography>
                <TextField
                  label="Max"
                  type="number"
                  value={course.maxCredits || 0}
                  onChange={(e) =>
                    handleChange('maxCredits', parseFloat(e.target.value) || 0)
                  }
                  size="small"
                  inputProps={{ min: 0, step: 0.5 }}
                  sx={{ width: 70 }}
                />
              </Box>
            )}
          </Box>

          {/* Advanced Options Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ p: 0.5 }}
            >
              {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </Typography>
          </Box>

          {/* Advanced Options */}
          <Collapse in={showAdvanced}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Prerequisites"
                value={course.prerequisite || ''}
                onChange={(e) => handleChange('prerequisite', e.target.value || undefined)}
                size="small"
                placeholder="e.g., ACC 200 or none"
                fullWidth
              />

              <TextField
                label="Terms Offered"
                value={(course.terms || []).join(', ')}
                onChange={(e) => {
                  const terms = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  handleChange('terms', terms.length > 0 ? terms : undefined);
                }}
                size="small"
                placeholder="e.g., Fall, Spring, Summer"
                helperText="Comma-separated list of terms"
                fullWidth
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isVariableCredit}
                    onChange={(e) => toggleVariableCredit(e.target.checked)}
                    size="small"
                  />
                }
                label="Variable credit course"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Max Repeats"
                  type="number"
                  value={course.maxRepeats || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleChange('maxRepeats', val > 0 ? val : undefined);
                  }}
                  size="small"
                  placeholder="1"
                  helperText="Times this course can be taken (leave empty if unlimited)"
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Sequence Group"
                  value={course.sequenceGroup || ''}
                  onChange={(e) => handleChange('sequenceGroup', e.target.value || undefined)}
                  size="small"
                  placeholder="e.g., IS Upper Division Core"
                  helperText="Group name for cohort-based sequencing"
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Sequence Order"
                  type="number"
                  value={course.sequenceOrder || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleChange('sequenceOrder', val > 0 ? val : undefined);
                  }}
                  size="small"
                  placeholder="1"
                  helperText="Order in sequence (1, 2, 3...)"
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          </Collapse>
        </Box>

        <Tooltip title="Delete course">
          <IconButton onClick={onDelete} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
