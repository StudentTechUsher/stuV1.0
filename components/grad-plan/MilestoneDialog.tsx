/**
 * Milestone Dialog Component
 *
 * Dialog for adding/editing academic milestones in graduation plans
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Calendar, Clock, GraduationCap } from 'lucide-react';

export interface Milestone {
  id?: string;
  type: 'internship' | 'study_abroad' | 'research' | 'study_break' | 'custom';
  title: string;
  timing: 'beginning' | 'middle' | 'before_last_year' | 'after_graduation' | 'specific_term';
  term?: string;
  year?: number;
}

interface MilestoneDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (milestone: Milestone) => void;
  milestone?: Milestone | null;
  milestoneType: Milestone['type'];
  availableTerms?: Array<{ term: string; year: number }>;
}

const MILESTONE_TYPE_LABELS: Record<Milestone['type'], string> = {
  internship: 'Internship',
  study_abroad: 'Study Abroad',
  research: 'Research Project',
  study_break: 'Study Break',
  custom: 'Custom Milestone',
};

const TIMING_OPTIONS = [
  { id: 'beginning' as const, label: 'Beginning', description: 'First semester' },
  { id: 'middle' as const, label: 'Middle', description: 'Around 50% completion' },
  { id: 'before_last_year' as const, label: 'Before Last Year', description: '1 year before final term' },
  { id: 'after_graduation' as const, label: 'After Graduation', description: 'After final term' },
  { id: 'specific_term' as const, label: 'Specific Term', description: 'Choose exact term' },
];

export function MilestoneDialog({
  open,
  onClose,
  onSave,
  milestone,
  milestoneType,
  availableTerms = [],
}: MilestoneDialogProps) {
  const [title, setTitle] = useState('');
  const [timing, setTiming] = useState<Milestone['timing']>('middle');
  const [selectedTerm, setSelectedTerm] = useState<{ term: string; year: number } | null>(null);

  // Initialize form when dialog opens or milestone changes
  useEffect(() => {
    if (open) {
      if (milestone) {
        setTitle(milestone.title);
        setTiming(milestone.timing);
        if (milestone.timing === 'specific_term' && milestone.term && milestone.year) {
          setSelectedTerm({ term: milestone.term, year: milestone.year });
        }
      } else {
        // Reset to defaults
        setTitle(getDefaultTitle(milestoneType));
        setTiming('middle');
        setSelectedTerm(null);
      }
    }
  }, [open, milestone, milestoneType]);

  const handleSave = () => {
    const newMilestone: Milestone = {
      id: milestone?.id || `milestone-${Date.now()}`,
      type: milestoneType,
      title: title.trim(),
      timing,
    };

    if (timing === 'specific_term' && selectedTerm) {
      newMilestone.term = selectedTerm.term;
      newMilestone.year = selectedTerm.year;
    }

    onSave(newMilestone);
    onClose();
  };

  const canSave = title.trim().length > 0 && (timing !== 'specific_term' || selectedTerm !== null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {milestone ? 'Edit' : 'Add'} {MILESTONE_TYPE_LABELS[milestoneType]}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Title Input */}
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g., ${getDefaultTitle(milestoneType)}`}
            autoFocus
          />

          {/* Timing Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              When should this occur?
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {TIMING_OPTIONS.map((option) => {
                const isSelected = timing === option.id;
                const Icon = getTimingIcon(option.id);

                return (
                  <Card
                    key={option.id}
                    onClick={() => setTiming(option.id)}
                    sx={{
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.50' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Icon size={18} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, mb: 0.25, lineHeight: 1.3 }}
                          >
                            {option.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>

          {/* Specific Term Selection */}
          {timing === 'specific_term' && availableTerms.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                Select Term
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {availableTerms.map((termOption, index) => {
                  const isSelected =
                    selectedTerm?.term === termOption.term && selectedTerm?.year === termOption.year;

                  return (
                    <Card
                      key={`${termOption.term}-${termOption.year}-${index}`}
                      onClick={() => setSelectedTerm(termOption)}
                      sx={{
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {termOption.term}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {termOption.year}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {milestone ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper functions

function getDefaultTitle(type: Milestone['type']): string {
  switch (type) {
    case 'internship':
      return 'Software Engineering Internship';
    case 'study_abroad':
      return 'Study Abroad Program';
    case 'research':
      return 'Research Project';
    case 'study_break':
      return 'Study Break';
    case 'custom':
      return 'Custom Milestone';
  }
}

function getTimingIcon(timing: Milestone['timing']) {
  switch (timing) {
    case 'beginning':
    case 'middle':
    case 'before_last_year':
      return Clock;
    case 'after_graduation':
      return GraduationCap;
    case 'specific_term':
      return Calendar;
  }
}

export default MilestoneDialog;
