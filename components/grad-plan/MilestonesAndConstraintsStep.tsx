/**
 * Milestones and Constraints Step Component
 *
 * Combined step for adding academic milestones and setting work constraints
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Briefcase,
  Globe,
  FlaskConical,
  Coffee,
  Sparkles,
  UserX,
  Clock,
  Calendar,
  GraduationCap,
  X,
} from 'lucide-react';
import { MilestoneDialog, Milestone } from './MilestoneDialog';
import { SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

interface MilestonesAndConstraintsStepProps {
  distribution?: SemesterAllocation[];
  studentType?: 'undergraduate' | 'honor' | 'graduate';
  onComplete: (data: {
    milestones: Milestone[];
    workConstraints: {
      workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable';
      additionalNotes: string;
    };
  }) => void;
  initialMilestones?: Milestone[];
  initialWorkStatus?: 'not_working' | 'part_time' | 'full_time' | 'variable';
  initialNotes?: string;
}

const MILESTONE_TYPES: Array<{
  id: Milestone['type'];
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
    { id: 'internship', label: 'Internship', icon: Briefcase, color: '#3B82F6' },
    { id: 'study_abroad', label: 'Study Abroad', icon: Globe, color: '#8B5CF6' },
    { id: 'research', label: 'Research Project', icon: FlaskConical, color: '#EC4899' },
    { id: 'study_break', label: 'Study Break', icon: Coffee, color: '#F59E0B' },
    { id: 'custom', label: 'Custom', icon: Sparkles, color: '#10B981' },
  ];

const WORK_STATUS_OPTIONS: Array<{
  id: 'not_working' | 'part_time' | 'full_time' | 'variable';
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}> = [
    {
      id: 'not_working',
      label: 'Not Working',
      icon: UserX,
      description: 'Focusing full-time on studies',
      color: '#6B7280',
    },
    {
      id: 'part_time',
      label: 'Part-time Work',
      icon: Clock,
      description: 'Working 10-20 hours per week',
      color: '#3B82F6',
    },
    {
      id: 'full_time',
      label: 'Full-time Work',
      icon: Briefcase,
      description: 'Working 30+ hours per week',
      color: '#EF4444',
    },
    {
      id: 'variable',
      label: 'Variable',
      icon: Calendar,
      description: 'Work schedule varies by semester',
      color: '#8B5CF6',
    },
  ];

export function MilestonesAndConstraintsStep({
  distribution,
  studentType,
  onComplete,
  initialMilestones = [],
  initialWorkStatus,
  initialNotes = '',
}: MilestonesAndConstraintsStepProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [workStatus, setWorkStatus] = useState<typeof WORK_STATUS_OPTIONS[number]['id'] | null>(
    initialWorkStatus || null
  );
  const [additionalNotes, setAdditionalNotes] = useState(initialNotes);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [selectedMilestoneType, setSelectedMilestoneType] = useState<Milestone['type'] | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const milestoneTypes = (() => {
    const base = [...MILESTONE_TYPES];
    if (studentType === 'honor') {
      const insertIndex = base.findIndex((type) => type.id === 'study_break');
      const honorsEntry = { id: 'honors_thesis', label: 'Honors Thesis', icon: GraduationCap, color: '#0EA5E9' };
      if (insertIndex >= 0) {
        base.splice(insertIndex + 1, 0, honorsEntry);
      } else {
        base.push(honorsEntry);
      }
    }
    return base;
  })();

  // Convert distribution to available terms for milestone dialog
  const availableTerms = distribution?.map(d => ({ term: d.term, year: d.year })) || [];

  const handleAddMilestone = (type: Milestone['type']) => {
    setSelectedMilestoneType(type);
    setEditingMilestone(null);
    setShowMilestoneDialog(true);
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setSelectedMilestoneType(milestone.type);
    setEditingMilestone(milestone);
    setShowMilestoneDialog(true);
  };

  const handleSaveMilestone = (milestone: Milestone) => {
    if (editingMilestone) {
      // Update existing
      setMilestones(prev => prev.map(m => (m.id === milestone.id ? milestone : m)));
    } else {
      // Add new
      setMilestones(prev => [...prev, milestone]);
    }
  };

  const handleRemoveMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
  };

  const handleContinue = () => {
    if (!workStatus) return;

    onComplete({
      milestones,
      workConstraints: {
        workStatus,
        additionalNotes: additionalNotes.trim(),
      },
    });
  };

  const canContinue = workStatus !== null;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Milestones and Constraints
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        Add important events to your plan and let us know about your work situation.
      </Typography>

      {/* Milestones Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Academic Milestones <span style={{ fontWeight: 400, color: '#6B7280' }}>(Optional)</span>
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Add important events to help structure your graduation plan
        </Typography>

        {/* Milestone Type Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5, mb: 3 }}>
          {milestoneTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Card
                key={type.id}
                onClick={() => handleAddMilestone(type.id)}
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: type.color,
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: `${type.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    <Icon size={20} color={type.color} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {type.label}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Added Milestones */}
        {milestones.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Added Milestones:
            </Typography>
            {milestones.map((milestone) => {
              const typeInfo = milestoneTypes.find(t => t.id === milestone.type);
              const Icon = typeInfo?.icon || Sparkles;

              return (
                <Card
                  key={milestone.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: `${typeInfo?.color || '#10B981'}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} color={typeInfo?.color || '#10B981'} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                          {milestone.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {getTimingLabel(milestone)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" onClick={() => handleEditMilestone(milestone)}>
                          Edit
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => milestone.id && handleRemoveMilestone(milestone.id)}
                        >
                          <X size={16} />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Work Constraints Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Work Constraints <span style={{ color: '#DC2626' }}>*</span>
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Let us know about your work situation during your studies
        </Typography>

        {/* Work Status Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {WORK_STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = workStatus === option.id;

            return (
              <Card
                key={option.id}
                onClick={() => setWorkStatus(option.id)}
                sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? option.color : 'divider',
                  bgcolor: isSelected ? `${option.color}10` : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: option.color,
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
              >
                <CardContent sx={{ p: 2, textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: `${option.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    <Icon size={24} color={option.color} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {option.description}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Additional Notes */}
        <TextField
          label="Additional Notes (Optional)"
          multiline
          rows={3}
          fullWidth
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Any other constraints or preferences we should know about..."
        />
      </Box>

      {/* Continue Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          disabled={!canContinue}
          sx={{
            bgcolor: 'var(--primary)',
            color: 'black',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'var(--primary)',
              opacity: 0.9,
            },
            '&:disabled': {
              bgcolor: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)',
            },
          }}
        >
          Continue to Plan Generation
        </Button>
      </Box>

      {/* Milestone Dialog */}
      {selectedMilestoneType && (
        <MilestoneDialog
          open={showMilestoneDialog}
          onClose={() => {
            setShowMilestoneDialog(false);
            setEditingMilestone(null);
          }}
          onSave={handleSaveMilestone}
          milestone={editingMilestone}
          milestoneType={selectedMilestoneType}
          availableTerms={availableTerms}
        />
      )}
    </Box>
  );
}

// Helper function to get timing label
function getTimingLabel(milestone: Milestone): string {
  switch (milestone.timing) {
    case 'beginning':
      return 'Beginning of plan';
    case 'middle':
      return 'Middle of plan';
    case 'before_last_year':
      return 'Before last year';
    case 'after_graduation':
      return 'After graduation';
    case 'specific_term':
      return `${milestone.term} ${milestone.year}`;
    default:
      return 'Unknown timing';
  }
}

export default MilestonesAndConstraintsStep;
