'use client';

import * as React from 'react';
import type { ProgramRequirement, Course, RequirementType } from '@/types/programRequirements';
import { REQUIREMENT_TYPE_OPTIONS } from '@/types/programRequirements';
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
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CourseEditorDialog from './course-editor-dialog';

export interface RequirementFormProps {
  requirement: ProgramRequirement;
  onSave: (requirement: ProgramRequirement) => void;
  onClose: () => void;
}

export default function RequirementForm({
  requirement: initialRequirement,
  onSave,
  onClose
}: Readonly<RequirementFormProps>) {
  const [requirement, setRequirement] = React.useState<ProgramRequirement>(initialRequirement);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [editingCourseIndex, setEditingCourseIndex] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<'form' | 'json'>('form');

  // JSON editor state
  const [jsonText, setJsonText] = React.useState(JSON.stringify(initialRequirement, null, 2));
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  const handleFieldChange = (field: string, value: unknown) => {
    setRequirement(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleTypeChange = (newType: RequirementType) => {
    const baseRequirement = {
      requirementId: requirement.requirementId,
      description: requirement.description,
      type: newType,
      notes: requirement.notes,
      courses: 'courses' in requirement ? requirement.courses : []
    };

    // Add type-specific constraints
    if (newType === 'chooseNOf') {
      setRequirement({
        ...baseRequirement,
        type: 'chooseNOf',
        constraints: { n: 1 }
      });
    } else if (newType === 'creditBucket') {
      setRequirement({
        ...baseRequirement,
        type: 'creditBucket',
        constraints: { minTotalCredits: 0 }
      });
    } else if (newType === 'noteOnly') {
      setRequirement({
        requirementId: requirement.requirementId,
        description: requirement.description,
        type: 'noteOnly',
        notes: requirement.notes,
        steps: []
      });
    } else {
      setRequirement({
        ...baseRequirement,
        type: newType
      });
    }
  };

  const handleAddCourse = () => {
    setEditingCourseIndex(-1); // -1 indicates adding new course
  };

  const handleEditCourse = (index: number) => {
    setEditingCourseIndex(index);
  };

  const handleSaveCourse = (course: Course) => {
    if (!('courses' in requirement)) {
      setRequirement(prev => ({ ...prev, courses: [course] }));
    } else {
      const courses = requirement.courses || [];
      if (editingCourseIndex === -1) {
        // Adding new course
        setRequirement(prev => ({
          ...prev,
          courses: [...courses, course]
        }));
      } else {
        // Editing existing course
        setRequirement(prev => ({
          ...prev,
          courses: courses.map((c, i) => (i === editingCourseIndex ? course : c))
        }));
      }
    }
    setEditingCourseIndex(null);
  };

  const handleDeleteCourse = (index: number) => {
    if ('courses' in requirement && requirement.courses) {
      setRequirement(prev => ({
        ...prev,
        courses: requirement.courses!.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddSubRequirement = () => {
    const newSubReq: ProgramRequirement = {
      requirementId: `${requirement.requirementId}.${(('subRequirements' in requirement && requirement.subRequirements?.length) || 0) + 1}`,
      description: 'New Sub-Requirement',
      type: 'allOf',
      courses: []
    };

    if ('subRequirements' in requirement) {
      setRequirement(prev => ({
        ...prev,
        subRequirements: [...(requirement.subRequirements || []), newSubReq]
      }));
    } else {
      setRequirement(prev => ({ ...prev, subRequirements: [newSubReq] }));
    }
  };

  const handleDeleteSubRequirement = (index: number) => {
    if ('subRequirements' in requirement && requirement.subRequirements) {
      setRequirement(prev => ({
        ...prev,
        subRequirements: requirement.subRequirements!.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddStep = () => {
    if ('steps' in requirement) {
      setRequirement(prev => ({
        ...prev,
        steps: [...(requirement.steps || []), '']
      }));
    }
  };

  const handleUpdateStep = (index: number, value: string) => {
    if ('steps' in requirement && requirement.steps) {
      setRequirement(prev => ({
        ...prev,
        steps: requirement.steps!.map((s, i) => (i === index ? value : s))
      }));
    }
  };

  const handleDeleteStep = (index: number) => {
    if ('steps' in requirement && requirement.steps) {
      setRequirement(prev => ({
        ...prev,
        steps: requirement.steps!.filter((_, i) => i !== index)
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!requirement.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (requirement.type === 'chooseNOf' && 'constraints' in requirement) {
      if (!requirement.constraints?.n || requirement.constraints.n < 1) {
        newErrors.n = 'N must be at least 1';
      }
    }

    if (requirement.type === 'creditBucket' && 'constraints' in requirement) {
      if (!requirement.constraints?.minTotalCredits || requirement.constraints.minTotalCredits < 0) {
        newErrors.minTotalCredits = 'Min credits must be at least 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        onSave(parsed);
        return;
      } catch (err) {
        setJsonError('Invalid JSON format');
        return;
      }
    }

    if (!validate()) return;
    onSave(requirement);
  };

  const handleViewModeChange = (_: React.SyntheticEvent, newValue: 'form' | 'json') => {
    if (newValue === 'json') {
      setJsonText(JSON.stringify(requirement, null, 2));
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        setRequirement(parsed);
        setJsonError(null);
      } catch (err) {
        // Keep current requirement if JSON is invalid
      }
    }
    setViewMode(newValue);
  };

  const currentTypeOption = REQUIREMENT_TYPE_OPTIONS.find(opt => opt.value === requirement.type);

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Edit Requirement {requirement.requirementId}
            </Typography>
            <Tabs value={viewMode} onChange={handleViewModeChange}>
              <Tab label="Form" value="form" />
              <Tab label="JSON" value="json" />
            </Tabs>
          </Box>
        </DialogTitle>

        <DialogContent>
          {viewMode === 'json' ? (
            <Box sx={{ mt: 2 }}>
              {jsonError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {jsonError}
                </Alert>
              )}
              <TextField
                multiline
                rows={20}
                fullWidth
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError(null);
                }}
                sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              {/* Basic Info */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Requirement ID"
                  value={requirement.requirementId}
                  onChange={(e) => handleFieldChange('requirementId', e.target.value)}
                  sx={{ flex: 1 }}
                  disabled
                />
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel>Requirement Type</InputLabel>
                  <Select
                    value={requirement.type}
                    label="Requirement Type"
                    onChange={(e) => handleTypeChange(e.target.value as RequirementType)}
                  >
                    {REQUIREMENT_TYPE_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Description"
                value={requirement.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description || currentTypeOption?.description}
                fullWidth
                required
              />

              <TextField
                label="Notes"
                value={requirement.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />

              {/* Type-specific constraints */}
              {requirement.type === 'chooseNOf' && 'constraints' in requirement && (
                <TextField
                  label="Number to Choose (N)"
                  type="number"
                  value={requirement.constraints?.n || 1}
                  onChange={(e) => handleFieldChange('constraints', { ...requirement.constraints, n: parseInt(e.target.value) })}
                  error={!!errors.n}
                  helperText={errors.n || 'How many items must be completed'}
                  inputProps={{ min: 1 }}
                  fullWidth
                  required
                />
              )}

              {requirement.type === 'creditBucket' && 'constraints' in requirement && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Minimum Total Credits"
                    type="number"
                    value={requirement.constraints?.minTotalCredits || 0}
                    onChange={(e) => handleFieldChange('constraints', { ...requirement.constraints, minTotalCredits: parseFloat(e.target.value) })}
                    error={!!errors.minTotalCredits}
                    helperText={errors.minTotalCredits}
                    inputProps={{ min: 0, step: 0.5 }}
                    sx={{ flex: 1 }}
                    required
                  />
                  <TextField
                    label="Maximum Total Credits (Optional)"
                    type="number"
                    value={requirement.constraints?.maxTotalCredits || ''}
                    onChange={(e) => handleFieldChange('constraints', { ...requirement.constraints, maxTotalCredits: e.target.value ? parseFloat(e.target.value) : undefined })}
                    inputProps={{ min: 0, step: 0.5 }}
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}

              {/* Sequencing Notes */}
              {requirement.type !== 'noteOnly' && (
                <>
                  <TextField
                    label="Sequencing Notes"
                    value={('sequencingNotes' in requirement && requirement.sequencingNotes) || ''}
                    onChange={(e) => handleFieldChange('sequencingNotes', e.target.value)}
                    multiline
                    rows={2}
                    helperText="Notes about course sequencing/ordering"
                    fullWidth
                  />

                  <TextField
                    label="Other Requirement"
                    value={('otherRequirement' in requirement && requirement.otherRequirement) || ''}
                    onChange={(e) => handleFieldChange('otherRequirement', e.target.value)}
                    multiline
                    rows={2}
                    helperText="Text-only additional requirement (e.g., 'Apply and be formally accepted')"
                    fullWidth
                  />
                </>
              )}

              <Divider />

              {/* Courses Section */}
              {requirement.type !== 'noteOnly' && 'courses' in requirement && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Courses
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddCourse}
                      size="small"
                      variant="outlined"
                    >
                      Add Course
                    </Button>
                  </Box>

                  {requirement.courses && requirement.courses.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {requirement.courses.map((course, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {course.code} - {course.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip label={`${course.credits} credits`} size="small" />
                              {course.prerequisite && course.prerequisite !== 'none' && (
                                <Chip label={`Prereq: ${course.prerequisite}`} size="small" variant="outlined" />
                              )}
                              {course.termsOffered && course.termsOffered.length > 0 && (
                                <Chip label={course.termsOffered.join(', ')} size="small" color="primary" />
                              )}
                              {course.sequenceGroup && (
                                <Chip label={`${course.sequenceGroup} (${course.sequenceOrder})`} size="small" color="secondary" />
                              )}
                            </Box>
                          </Box>
                          <IconButton size="small" onClick={() => handleEditCourse(index)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteCourse(index)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">No courses added yet</Alert>
                  )}
                </Box>
              )}

              {/* Sub-Requirements Section */}
              {currentTypeOption?.supportsSubrequirements && 'subRequirements' in requirement && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Sub-Requirements
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddSubRequirement}
                      size="small"
                      variant="outlined"
                    >
                      Add Sub-Requirement
                    </Button>
                  </Box>

                  {requirement.subRequirements && requirement.subRequirements.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {requirement.subRequirements.map((subReq, index) => (
                        <Accordion key={index}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                              <Chip label={subReq.requirementId} size="small" />
                              <Typography>{subReq.description}</Typography>
                              <Chip label={subReq.type} size="small" variant="outlined" />
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubRequirement(index);
                              }}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </AccordionSummary>
                          <AccordionDetails>
                            <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs">
                              {JSON.stringify(subReq, null, 2)}
                            </pre>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">No sub-requirements added yet</Alert>
                  )}
                </Box>
              )}

              {/* Steps Section (for noteOnly type) */}
              {requirement.type === 'noteOnly' && 'steps' in requirement && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Steps
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddStep}
                      size="small"
                      variant="outlined"
                    >
                      Add Step
                    </Button>
                  </Box>

                  {requirement.steps && requirement.steps.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {requirement.steps.map((step, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                          <TextField
                            value={step}
                            onChange={(e) => handleUpdateStep(index, e.target.value)}
                            fullWidth
                            multiline
                            placeholder={`Step ${index + 1}`}
                          />
                          <IconButton size="small" onClick={() => handleDeleteStep(index)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">No steps added yet</Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
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
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Course Editor Dialog */}
      {editingCourseIndex !== null && (
        <CourseEditorDialog
          course={
            editingCourseIndex === -1
              ? null
              : 'courses' in requirement && requirement.courses
              ? requirement.courses[editingCourseIndex]
              : null
          }
          onSave={handleSaveCourse}
          onClose={() => setEditingCourseIndex(null)}
        />
      )}
    </>
  );
}
