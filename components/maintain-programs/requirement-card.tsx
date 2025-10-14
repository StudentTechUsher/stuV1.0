'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Typography,
  Box,
  Chip,
  Collapse,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import InfoIcon from '@mui/icons-material/Info';
import type {
  ProgramRequirement,
  Course,
  RequirementType,
  REQUIREMENT_TYPE_OPTIONS
} from '@/types/programRequirements';
import { REQUIREMENT_TYPE_OPTIONS as typeOptions } from '@/types/programRequirements';
import CourseForm from './course-form';
import ConstraintsEditor from './constraints-editor';

export interface RequirementCardProps {
  requirement: ProgramRequirement;
  onChange: (requirement: ProgramRequirement) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  index: number;
}

export default function RequirementCard({
  requirement,
  onChange,
  onDelete,
  onDuplicate,
  index
}: Readonly<RequirementCardProps>) {
  const [expanded, setExpanded] = React.useState(true);
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

  const typeOption = typeOptions.find((opt) => opt.value === requirement.type);

  const handleTypeChange = (newType: RequirementType) => {
    // When changing type, preserve what we can
    const baseReq = {
      requirementId: requirement.requirementId,
      description: requirement.description,
      notes: requirement.notes,
      type: newType,
      displayOrder: requirement.displayOrder,
      isCollapsible: requirement.isCollapsible,
      colorTag: requirement.colorTag
    };

    // Add type-specific defaults
    switch (newType) {
      case 'chooseNOf':
        onChange({
          ...baseReq,
          type: 'chooseNOf',
          courses: 'courses' in requirement ? requirement.courses : [],
          constraints: { n: 1 }
        });
        break;
      case 'creditBucket':
        onChange({
          ...baseReq,
          type: 'creditBucket',
          courses: 'courses' in requirement ? requirement.courses : [],
          constraints: { minTotalCredits: 12 }
        });
        break;
      case 'allOf':
        onChange({
          ...baseReq,
          type: 'allOf',
          courses: 'courses' in requirement ? requirement.courses : []
        });
        break;
      case 'noteOnly':
        onChange({
          ...baseReq,
          type: 'noteOnly',
          steps: []
        });
        break;
      case 'sequence':
        onChange({
          ...baseReq,
          type: 'sequence',
          sequence: []
        });
        break;
      case 'optionGroup':
        onChange({
          ...baseReq,
          type: 'optionGroup',
          options: []
        });
        break;
    }
  };

  const handleAddCourse = () => {
    if (
      requirement.type === 'allOf' ||
      requirement.type === 'chooseNOf' ||
      requirement.type === 'creditBucket'
    ) {
      const newCourse: Course = {
        code: '',
        title: '',
        credits: 3
      };
      onChange({
        ...requirement,
        courses: [...(requirement.courses || []), newCourse]
      });
    }
  };

  const handleCourseChange = (index: number, course: Course) => {
    if (
      requirement.type === 'allOf' ||
      requirement.type === 'chooseNOf' ||
      requirement.type === 'creditBucket'
    ) {
      const updated = [...(requirement.courses || [])];
      updated[index] = course;
      onChange({ ...requirement, courses: updated });
    }
  };

  const handleDeleteCourse = (index: number) => {
    if (
      requirement.type === 'allOf' ||
      requirement.type === 'chooseNOf' ||
      requirement.type === 'creditBucket'
    ) {
      const updated = (requirement.courses || []).filter((_, i) => i !== index);
      onChange({ ...requirement, courses: updated });
    }
  };

  const handleAddStep = () => {
    if (requirement.type === 'noteOnly') {
      onChange({
        ...requirement,
        steps: [...(requirement.steps || []), '']
      });
    }
  };

  const handleStepChange = (index: number, value: string) => {
    if (requirement.type === 'noteOnly') {
      const updated = [...(requirement.steps || [])];
      updated[index] = value;
      onChange({ ...requirement, steps: updated });
    }
  };

  const handleDeleteStep = (index: number) => {
    if (requirement.type === 'noteOnly') {
      const updated = (requirement.steps || []).filter((_, i) => i !== index);
      onChange({ ...requirement, steps: updated });
    }
  };

  const getCourseList = () => {
    if (
      requirement.type === 'allOf' ||
      requirement.type === 'chooseNOf' ||
      requirement.type === 'creditBucket'
    ) {
      return requirement.courses || [];
    }
    return [];
  };

  return (
    <Card
      sx={{
        mb: 2,
        border: '2px solid',
        borderColor: expanded ? 'primary.main' : 'divider',
        transition: 'all 0.2s'
      }}
    >
      <CardHeader
        avatar={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
            <Chip
              label={typeOption?.icon || '?'}
              size="small"
              sx={{
                fontWeight: 'bold',
                bgcolor: 'primary.main',
                color: 'white',
                minWidth: 36
              }}
            />
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              Requirement #{index + 1}
            </Typography>
            <Chip label={typeOption?.label || requirement.type} size="small" />
            {requirement.constraints?.admissionsGate && (
              <Chip label="Admissions Gate" size="small" color="warning" />
            )}
          </Box>
        }
        subheader={requirement.description || 'No description'}
      />

      <Collapse in={expanded}>
        <CardContent>
          {/* Basic Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              label="Description"
              value={requirement.description}
              onChange={(e) =>
                onChange({ ...requirement, description: e.target.value })
              }
              fullWidth
              required
              placeholder="e.g., Complete 3 Courses"
            />

            <TextField
              label="Notes"
              value={requirement.notes || ''}
              onChange={(e) =>
                onChange({ ...requirement, notes: e.target.value || undefined })
              }
              fullWidth
              multiline
              rows={2}
              placeholder="Additional information for students (optional)"
            />

            {(requirement.type === 'allOf' ||
              requirement.type === 'chooseNOf' ||
              requirement.type === 'creditBucket') && (
              <>
                <TextField
                  label="Sequencing Notes"
                  value={requirement.sequencingNotes || ''}
                  onChange={(e) =>
                    onChange({ ...requirement, sequencingNotes: e.target.value || undefined })
                  }
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g., Upper-division IS core is cohort-based: take Fall block followed by Winter block"
                />

                <TextField
                  label="Other Requirements"
                  value={requirement.otherRequirement || ''}
                  onChange={(e) =>
                    onChange({ ...requirement, otherRequirement: e.target.value || undefined })
                  }
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g., Apply and be formally accepted into the program"
                />
              </>
            )}

            <FormControl fullWidth>
              <InputLabel>Requirement Type</InputLabel>
              <Select
                value={requirement.type}
                label="Requirement Type"
                onChange={(e) => handleTypeChange(e.target.value as RequirementType)}
              >
                {typeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ minWidth: 24, fontWeight: 'bold' }}>
                        {opt.icon}
                      </Typography>
                      <Box>
                        <Typography>{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Constraints Editor */}
          <ConstraintsEditor
            requirement={requirement}
            onChange={onChange}
          />

          <Divider sx={{ my: 2 }} />

          {/* Content based on type */}
          {(requirement.type === 'allOf' ||
            requirement.type === 'chooseNOf' ||
            requirement.type === 'creditBucket') && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">Courses</Typography>
                  {requirement.type === 'creditBucket' && requirement.constraints?.minTotalCredits && (
                    <Typography variant="caption" color="text.secondary">
                      Students must earn at least {requirement.constraints.minTotalCredits} credits
                      {requirement.constraints.maxTotalCredits && ` (up to ${requirement.constraints.maxTotalCredits})`}
                    </Typography>
                  )}
                </Box>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddCourse}
                  variant="outlined"
                  size="small"
                >
                  Add Course
                </Button>
              </Box>

              {getCourseList().length === 0 ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}
                >
                  <Typography color="text.secondary">
                    No courses added yet. Click &quot;Add Course&quot; to get started.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {getCourseList().map((course, idx) => (
                    <CourseForm
                      key={idx}
                      course={course}
                      onChange={(c) => handleCourseChange(idx, c)}
                      onDelete={() => handleDeleteCourse(idx)}
                      index={idx}
                    />
                  ))}
                </Box>
              )}

              {/* Sub-requirements Section */}
              {(requirement.type === 'allOf' ||
                requirement.type === 'chooseNOf' ||
                requirement.type === 'creditBucket') && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Sub-Requirements (Nested)</Typography>
                    <Tooltip title="Sub-requirements allow you to create hierarchical requirement structures, like requirement 1.1, 1.2 under requirement 1">
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      border: '2px dashed',
                      borderColor: 'info.main',
                      borderRadius: 1,
                      bgcolor: 'info.50'
                    }}
                  >
                    <Typography color="info.dark" gutterBottom>
                      Sub-requirements builder coming soon
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      This feature will allow you to nest requirements within requirements
                      (e.g., PWS program&apos;s Design/Installation/Maintenance sub-emphases).
                      For now, you can manually add them via JSON mode.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {requirement.type === 'noteOnly' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Steps / Notes</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                  variant="outlined"
                  size="small"
                >
                  Add Step
                </Button>
              </Box>

              {(!requirement.steps || requirement.steps.length === 0) ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}
                >
                  <Typography color="text.secondary">
                    No steps added yet. Click &quot;Add Step&quot; to get started.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {requirement.steps.map((step, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'flex-start'
                      }}
                    >
                      <Typography sx={{ mt: 2, minWidth: 30 }}>
                        {idx + 1}.
                      </Typography>
                      <TextField
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        fullWidth
                        multiline
                        placeholder="Enter step description"
                      />
                      <Tooltip title="Delete step">
                        <IconButton onClick={() => handleDeleteStep(idx)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {requirement.type === 'sequence' && (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'warning.main',
                borderRadius: 1,
                bgcolor: 'warning.50'
              }}
            >
              <Typography color="warning.dark">
                Sequence builder coming soon
              </Typography>
            </Box>
          )}

          {requirement.type === 'optionGroup' && (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'warning.main',
                borderRadius: 1,
                bgcolor: 'warning.50'
              }}
            >
              <Typography color="warning.dark">
                Option group builder coming soon
              </Typography>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {onDuplicate && (
          <MenuItem
            onClick={() => {
              onDuplicate();
              setMenuAnchor(null);
            }}
          >
            Duplicate
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setExpanded(false);
          }}
        >
          Collapse
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onDelete();
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Requirement
        </MenuItem>
      </Menu>
    </Card>
  );
}