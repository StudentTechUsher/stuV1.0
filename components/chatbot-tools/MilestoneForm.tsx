'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import { Target, Plus, X, CheckCircle } from 'lucide-react';
import {
  MilestoneInput,
  Milestone,
  MilestoneTiming,
  getMilestoneTimingLabel,
} from '@/lib/chatbot/tools/milestoneTool';
import { EventType } from '@/components/grad-planner/types';

interface MilestoneFormProps {
  onSubmit: (data: MilestoneInput) => void;
}

// Available milestone types
const MILESTONE_TYPES: EventType[] = [
  'Apply for Graduation',
  'Apply for Graduate School',
  'Co-op',
  'Internship',
  'Major/Minor Application',
  'Religious Deferment (Mission)',
  'Research Project',
  'Sabbatical',
  'Study Abroad',
  'Teaching Assistant',
  'Other',
];

export default function MilestoneForm({
  onSubmit,
}: Readonly<MilestoneFormProps>) {
  const [hasMilestones, setHasMilestones] = useState<boolean | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [currentMilestoneType, setCurrentMilestoneType] = useState<EventType | ''>('');
  const [currentMilestoneTitle, setCurrentMilestoneTitle] = useState('');
  const [currentMilestoneTiming, setCurrentMilestoneTiming] = useState<MilestoneTiming>('ai_choose');

  const handleAddMilestone = () => {
    if (!currentMilestoneType) return;

    const newMilestone: Milestone = {
      type: currentMilestoneType,
      title: currentMilestoneTitle.trim() || currentMilestoneType,
      timing: currentMilestoneTiming,
    };

    setMilestones([...milestones, newMilestone]);
    setCurrentMilestoneType('');
    setCurrentMilestoneTitle('');
    setCurrentMilestoneTiming('ai_choose');
    setShowMilestoneForm(false);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmitWithMilestones = () => {
    onSubmit({
      hasMilestones: true,
      milestones: milestones.length > 0 ? milestones : undefined,
    });
  };

  const handleSkip = () => {
    onSubmit({
      hasMilestones: false,
    });
  };

  // Initial question screen
  if (hasMilestones === null) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target size={20} />
            Academic Milestones
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Do you have any important milestones you want to achieve during your studies?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Examples: Internships, study abroad, research projects, applying for graduate school, etc.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={() => setHasMilestones(true)}
            className="w-full gap-2 justify-start"
          >
            <Target size={18} />
            Yes, I want to add milestones
          </Button>

          <Button
            variant="secondary"
            onClick={handleSkip}
            className="w-full gap-2 justify-start"
          >
            <X size={18} />
            No, continue without milestones
          </Button>
        </div>
      </div>
    );
  }

  // Milestones form
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target size={20} />
          Your Milestones
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add important milestones you want to achieve during your academic journey
        </p>
      </div>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Display existing milestones */}
        {milestones.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {milestones.map((milestone, index) => (
              <Chip
                key={index}
                label={`${milestone.title} (${getMilestoneTimingLabel(milestone.timing)})`}
                onDelete={() => handleRemoveMilestone(index)}
                deleteIcon={<DeleteIcon />}
                sx={{
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #3b82f6',
                  '& .MuiChip-deleteIcon': {
                    color: '#ef4444',
                    '&:hover': {
                      color: '#dc2626',
                    },
                  },
                }}
              />
            ))}
          </Box>
        )}

        {/* Add milestone button */}
        {!showMilestoneForm && (
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowMilestoneForm(true)}
            className="gap-2"
          >
            <Plus size={18} />
            Add Milestone
          </Button>
        )}

        {/* Milestone form */}
        {showMilestoneForm && (
          <Box
            sx={{
              p: 3,
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.12)',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              select
              size="small"
              label="Milestone Type"
              value={currentMilestoneType}
              onChange={(e) => {
                setCurrentMilestoneType(e.target.value as EventType);
                if (!currentMilestoneTitle) {
                  setCurrentMilestoneTitle(e.target.value);
                }
              }}
              required
            >
              <MenuItem value="">
                <em>Select a milestone type</em>
              </MenuItem>
              {MILESTONE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              size="small"
              label="Milestone Title (Optional)"
              value={currentMilestoneTitle}
              onChange={(e) => setCurrentMilestoneTitle(e.target.value)}
              placeholder={currentMilestoneType || 'e.g., Summer Internship at Tech Company'}
              helperText="Give it a custom name or leave blank to use the type"
            />

            <TextField
              fullWidth
              select
              size="small"
              label="When do you want to achieve this?"
              value={currentMilestoneTiming}
              onChange={(e) => setCurrentMilestoneTiming(e.target.value as MilestoneTiming)}
              required
            >
              <MenuItem value="ai_choose">{getMilestoneTimingLabel('ai_choose')}</MenuItem>
              <MenuItem value="beginning">{getMilestoneTimingLabel('beginning')}</MenuItem>
              <MenuItem value="middle">{getMilestoneTimingLabel('middle')}</MenuItem>
              <MenuItem value="before_last_year">{getMilestoneTimingLabel('before_last_year')}</MenuItem>
              <MenuItem value="after_graduation">{getMilestoneTimingLabel('after_graduation')}</MenuItem>
            </TextField>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="primary"
                type="button"
                size="sm"
                onClick={handleAddMilestone}
                disabled={!currentMilestoneType}
                className="flex-1"
              >
                Add to List
              </Button>
              <Button
                variant="secondary"
                type="button"
                size="sm"
                onClick={() => {
                  setShowMilestoneForm(false);
                  setCurrentMilestoneType('');
                  setCurrentMilestoneTitle('');
                  setCurrentMilestoneTiming('ai_choose');
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleSubmitWithMilestones}
            className="flex-1 gap-2"
          >
            <CheckCircle size={18} />
            Continue {milestones.length > 0 ? `with ${milestones.length} milestone${milestones.length > 1 ? 's' : ''}` : ''}
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => setHasMilestones(null)}
            className="px-4"
          >
            Back
          </Button>
        </div>
      </Box>
    </div>
  );
}
