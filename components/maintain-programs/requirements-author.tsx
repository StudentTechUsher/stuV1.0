'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PreviewIcon from '@mui/icons-material/Preview';
import CodeIcon from '@mui/icons-material/Code';
import EditIcon from '@mui/icons-material/Edit';
import type {
  ProgramRequirement,
  ProgramRequirementsStructure,
  RequirementType
} from '@/types/programRequirements';
import RequirementCard from './requirement-card';
import StudentRequirementsView from './student-requirements-view';

export interface RequirementsAuthorProps {
  initialRequirements: ProgramRequirementsStructure | string;
  onChange: (requirements: ProgramRequirementsStructure) => void;
}

type ViewMode = 'author' | 'preview' | 'json';

export default function RequirementsAuthor({
  initialRequirements,
  onChange
}: Readonly<RequirementsAuthorProps>) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('author');
  const [requirements, setRequirements] = React.useState<ProgramRequirement[]>([]);
  const [nextId, setNextId] = React.useState(1);
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const [jsonText, setJsonText] = React.useState('');
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  // Initialize requirements from prop
  React.useEffect(() => {
    try {
      let parsed: ProgramRequirementsStructure;

      if (typeof initialRequirements === 'string') {
        if (initialRequirements.trim() === '') {
          parsed = { programRequirements: [] };
        } else {
          parsed = JSON.parse(initialRequirements);
        }
      } else {
        parsed = initialRequirements;
      }

      const reqs = parsed.programRequirements || [];
      setRequirements(reqs);

      // Set next ID based on existing requirements
      const maxId = reqs.reduce(
        (max, req) => {
          const id = typeof req.requirementId === 'number' ? req.requirementId : 0;
          return Math.max(max, id);
        },
        0
      );
      setNextId(maxId + 1);

      // Set JSON text
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error('Failed to parse initial requirements:', error);
      setRequirements([]);
      setNextId(1);
    }
  }, [initialRequirements]);

  // Notify parent of changes
  React.useEffect(() => {
    const structure: ProgramRequirementsStructure = {
      programRequirements: requirements,
      metadata: {
        version: '1.0',
        lastModified: new Date().toISOString(),
        totalMinCredits: calculateTotalMinCredits(requirements)
      }
    };
    onChange(structure);
  }, [requirements, onChange]);

  const calculateTotalMinCredits = (reqs: ProgramRequirement[]): number => {
    let total = 0;
    reqs.forEach((req) => {
      if (req.type === 'allOf' || req.type === 'chooseNOf' || req.type === 'creditBucket') {
        const courses = req.courses || [];
        courses.forEach((course) => {
          total += course.minCredits || course.credits;
        });
      }
    });
    return total;
  };

  const handleAddRequirement = (type: RequirementType) => {
    const baseReq = {
      requirementId: nextId,
      description: '',
      type,
      displayOrder: requirements.length
    };

    let newReq: ProgramRequirement;

    switch (type) {
      case 'allOf':
        newReq = { ...baseReq, type: 'allOf', courses: [] };
        break;
      case 'chooseNOf':
        newReq = {
          ...baseReq,
          type: 'chooseNOf',
          courses: [],
          constraints: { n: 1 }
        };
        break;
      case 'creditBucket':
        newReq = {
          ...baseReq,
          type: 'creditBucket',
          courses: [],
          constraints: { minTotalCredits: 12 }
        };
        break;
      case 'noteOnly':
        newReq = { ...baseReq, type: 'noteOnly', steps: [] };
        break;
      case 'sequence':
        newReq = { ...baseReq, type: 'sequence', sequence: [] };
        break;
      case 'optionGroup':
        newReq = { ...baseReq, type: 'optionGroup', options: [] };
        break;
    }

    setRequirements([...requirements, newReq]);
    setNextId(nextId + 1);
    setAddMenuOpen(false);
  };

  const handleUpdateRequirement = (index: number, updated: ProgramRequirement) => {
    const newReqs = [...requirements];
    newReqs[index] = updated;
    setRequirements(newReqs);
  };

  const handleDeleteRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleDuplicateRequirement = (index: number) => {
    const toDuplicate = requirements[index];
    const duplicated = {
      ...JSON.parse(JSON.stringify(toDuplicate)),
      requirementId: nextId,
      description: `${toDuplicate.description} (Copy)`
    };
    setRequirements([...requirements, duplicated]);
    setNextId(nextId + 1);
  };

  const handleApplyJson = () => {
    try {
      const parsed: ProgramRequirementsStructure = JSON.parse(jsonText);
      const reqs = parsed.programRequirements || [];
      setRequirements(reqs);

      const maxId = reqs.reduce(
        (max, req) => {
          const id = typeof req.requirementId === 'number' ? req.requirementId : 0;
          return Math.max(max, id);
        },
        0
      );
      setNextId(maxId + 1);

      setJsonError(null);
      setViewMode('author');
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleSyncJsonToAuthor = () => {
    const structure: ProgramRequirementsStructure = {
      programRequirements: requirements,
      metadata: {
        version: '1.0',
        lastModified: new Date().toISOString()
      }
    };
    setJsonText(JSON.stringify(structure, null, 2));
  };

  return (
    <Box>
      {/* View Mode Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              if (newMode === 'json') {
                handleSyncJsonToAuthor();
              }
              setViewMode(newMode);
            }
          }}
          size="small"
        >
          <ToggleButton value="author">
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Author
          </ToggleButton>
          <ToggleButton value="preview">
            <PreviewIcon sx={{ mr: 1 }} fontSize="small" />
            Student Preview
          </ToggleButton>
          <ToggleButton value="json">
            <CodeIcon sx={{ mr: 1 }} fontSize="small" />
            JSON
          </ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'author' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddMenuOpen(true)}
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
        )}
      </Box>

      {/* Author View */}
      {viewMode === 'author' && (
        <Box>
          {requirements.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                bgcolor: 'grey.50'
              }}
            >
              <Typography variant="h6" gutterBottom>
                No Requirements Yet
              </Typography>
              <Typography color="text.secondary" paragraph>
                Get started by adding your first requirement. You can choose from different
                types like &quot;Complete All&quot;, &quot;Choose N&quot;, or &quot;Credit Threshold&quot;.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddMenuOpen(true)}
                sx={{
                  backgroundColor: '#12F987',
                  color: '#0A0A0A',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#0ed676'
                  }
                }}
              >
                Add First Requirement
              </Button>
            </Paper>
          ) : (
            <Box>
              {requirements.map((req, index) => (
                <RequirementCard
                  key={req.requirementId}
                  requirement={req}
                  onChange={(updated) => handleUpdateRequirement(index, updated)}
                  onDelete={() => handleDeleteRequirement(index)}
                  onDuplicate={() => handleDuplicateRequirement(index)}
                  index={index}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Student Preview View */}
      {viewMode === 'preview' && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            This is how students will see the requirements. You can test the progress
            tracking by marking courses as complete.
          </Alert>
          <StudentRequirementsView requirements={requirements} />
        </Box>
      )}

      {/* JSON View */}
      {viewMode === 'json' && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Advanced: Edit the requirements as JSON. Click &quot;Apply Changes&quot; to update
            the author view.
          </Alert>

          {jsonError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {jsonError}
            </Alert>
          )}

          <Paper sx={{ p: 2, bgcolor: 'grey.900' }}>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '500px',
                fontFamily: '"Courier New", monospace',
                fontSize: '14px',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                border: 'none',
                outline: 'none',
                padding: '16px',
                resize: 'vertical'
              }}
            />
          </Paper>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleApplyJson}
              sx={{
                backgroundColor: '#12F987',
                color: '#0A0A0A',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#0ed676'
                }
              }}
            >
              Apply Changes
            </Button>
            <Button variant="outlined" onClick={handleSyncJsonToAuthor}>
              Sync from Author View
            </Button>
          </Box>
        </Box>
      )}

      {/* Add Requirement Dialog */}
      <Dialog open={addMenuOpen} onClose={() => setAddMenuOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Requirement</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose a requirement type:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              {
                type: 'allOf' as RequirementType,
                label: 'Complete All',
                desc: 'Student must complete all courses',
                icon: '✓'
              },
              {
                type: 'chooseNOf' as RequirementType,
                label: 'Choose N',
                desc: 'Student chooses N courses from a list',
                icon: '#'
              },
              {
                type: 'creditBucket' as RequirementType,
                label: 'Credit Threshold',
                desc: 'Earn minimum credits from available courses',
                icon: '∑'
              },
              {
                type: 'optionGroup' as RequirementType,
                label: 'Track Selection',
                desc: 'Student picks one track/concentration',
                icon: '⇄'
              },
              {
                type: 'sequence' as RequirementType,
                label: 'Sequence',
                desc: 'Courses in specific order (by term)',
                icon: '→'
              },
              {
                type: 'noteOnly' as RequirementType,
                label: 'Information Only',
                desc: 'Steps or notes without courses',
                icon: 'ℹ'
              }
            ].map((option) => (
              <Button
                key={option.type}
                onClick={() => handleAddRequirement(option.type)}
                variant="outlined"
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 2,
                  '&:hover': {
                    backgroundColor: 'primary.50'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography
                    sx={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      minWidth: 40,
                      textAlign: 'center'
                    }}
                  >
                    {option.icon}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.desc}
                    </Typography>
                  </Box>
                </Box>
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMenuOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}