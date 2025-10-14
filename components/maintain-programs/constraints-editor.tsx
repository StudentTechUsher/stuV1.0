'use client';

import * as React from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import type { ProgramRequirement, RequirementConstraints } from '@/types/programRequirements';

export interface ConstraintsEditorProps {
  requirement: ProgramRequirement;
  onChange: (requirement: ProgramRequirement) => void;
}

export default function ConstraintsEditor({
  requirement,
  onChange
}: Readonly<ConstraintsEditorProps>) {
  const constraints = requirement.constraints || {};

  const updateConstraint = <K extends keyof RequirementConstraints>(
    key: K,
    value: RequirementConstraints[K]
  ) => {
    onChange({
      ...requirement,
      constraints: {
        ...constraints,
        [key]: value
      }
    } as ProgramRequirement);
  };

  const removeConstraint = (key: keyof RequirementConstraints) => {
    const updated = { ...constraints };
    delete updated[key];
    onChange({
      ...requirement,
      constraints: Object.keys(updated).length > 0 ? updated : undefined
    } as ProgramRequirement);
  };

  const activeConstraintsCount = Object.keys(constraints).filter(
    (key) => key !== 'n' && key !== 'minTotalCredits' // Exclude required constraints
  ).length;

  return (
    <Accordion defaultExpanded={activeConstraintsCount > 0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="h6">Constraints & Rules</Typography>
          {activeConstraintsCount > 0 && (
            <Chip
              label={`${activeConstraintsCount} active`}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Required constraints based on type */}
          {requirement.type === 'chooseNOf' && (
            <TextField
              label="Number of Items Required (N)"
              type="number"
              value={constraints.n || 1}
              onChange={(e) => updateConstraint('n', parseInt(e.target.value) || 1)}
              required
              inputProps={{ min: 1 }}
              helperText="How many courses/items must be completed"
              fullWidth
            />
          )}

          {requirement.type === 'creditBucket' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Minimum Total Credits"
                type="number"
                value={constraints.minTotalCredits || 0}
                onChange={(e) =>
                  updateConstraint('minTotalCredits', parseFloat(e.target.value) || 0)
                }
                required
                inputProps={{ min: 0, step: 0.5 }}
                helperText="Total credits needed to satisfy this requirement"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Maximum Total Credits (optional)"
                type="number"
                value={constraints.maxTotalCredits || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > 0) {
                    updateConstraint('maxTotalCredits', val);
                  } else {
                    removeConstraint('maxTotalCredits');
                  }
                }}
                inputProps={{ min: 0, step: 0.5 }}
                helperText="Maximum credits allowed (e.g., 'up to 8.0 credit hours')"
                sx={{ flex: 1 }}
              />
            </Box>
          )}

          {/* Optional constraints */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!constraints.admissionsGate}
                  onChange={(e) =>
                    e.target.checked
                      ? updateConstraint('admissionsGate', true)
                      : removeConstraint('admissionsGate')
                  }
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography>Admissions Gate</Typography>
                  <Tooltip title="Students must complete this requirement before being admitted to the program">
                    <IconButton size="small" sx={{ p: 0 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!constraints.noDoubleCount}
                  onChange={(e) =>
                    e.target.checked
                      ? updateConstraint('noDoubleCount', true)
                      : removeConstraint('noDoubleCount')
                  }
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography>No Double Counting</Typography>
                  <Tooltip title="Courses in this requirement cannot count toward other requirements">
                    <IconButton size="small" sx={{ p: 0 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          </Box>

          {requirement.type === 'optionGroup' && (
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!constraints.trackExclusive}
                    onChange={(e) =>
                      e.target.checked
                        ? updateConstraint('trackExclusive', true)
                        : removeConstraint('trackExclusive')
                    }
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography>Track Exclusive</Typography>
                    <Tooltip title="Student must choose only one track and cannot mix courses from different tracks">
                      <IconButton size="small" sx={{ p: 0 }}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
            </Box>
          )}

          {/* Grade Requirements */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Grade Requirements</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Minimum Grade"
                  value={constraints.minGrade || ''}
                  onChange={(e) =>
                    e.target.value
                      ? updateConstraint('minGrade', e.target.value)
                      : removeConstraint('minGrade')
                  }
                  placeholder="e.g., B, C+, 2.7"
                  helperText="Minimum grade required for each course"
                  fullWidth
                />

                <TextField
                  label="Minimum GPA"
                  type="number"
                  value={constraints.minGPA || ''}
                  onChange={(e) =>
                    e.target.value
                      ? updateConstraint('minGPA', parseFloat(e.target.value))
                      : removeConstraint('minGPA')
                  }
                  inputProps={{ min: 0, max: 4.0, step: 0.1 }}
                  helperText="Minimum GPA required for this requirement group"
                  fullWidth
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Group Caps - Advanced */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Advanced: Group Caps & Course Caps
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Group caps and per-course caps builder coming soon.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  These allow you to set limits like &quot;max 2 courses from 100-level&quot; or
                  &quot;course can only count once&quot;.
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}