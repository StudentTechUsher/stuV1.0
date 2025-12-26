'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { MessageSquarePlus, ArrowRight, X } from 'lucide-react';
import {
  AdditionalConcernsInput,
  WorkStatus,
  AcademicPriority,
  getWorkStatusLabel,
  getAcademicPriorityLabel,
} from '@/lib/chatbot/tools/additionalConcernsTool';

interface AdditionalConcernsFormProps {
  onSubmit: (data: AdditionalConcernsInput) => void;
}

export default function AdditionalConcernsForm({
  onSubmit,
}: Readonly<AdditionalConcernsFormProps>) {
  const [hasAdditionalConcerns, setHasAdditionalConcerns] = useState<boolean | null>(null);
  const [workStatus, setWorkStatus] = useState<WorkStatus | ''>('');
  const [academicPriority, setAcademicPriority] = useState<AcademicPriority | ''>('');
  const [otherConcerns, setOtherConcerns] = useState('');

  const handleSubmitWithConcerns = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      hasAdditionalConcerns: true,
      workStatus: workStatus || undefined,
      academicPriority: academicPriority || undefined,
      otherConcerns: otherConcerns.trim() || undefined,
    });
  };

  const handleSkip = () => {
    onSubmit({
      hasAdditionalConcerns: false,
    });
  };

  // Initial question screen
  if (hasAdditionalConcerns === null) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquarePlus size={20} />
            Additional Preferences
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Do you have any additional preferences or constraints we should consider when creating your graduation plan?
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setHasAdditionalConcerns(true)}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2 justify-start"
          >
            <MessageSquarePlus size={18} />
            Yes, I have preferences to share
          </Button>

          <Button
            onClick={handleSkip}
            variant="outline"
            className="w-full gap-2 justify-start border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
            No, continue with default settings
          </Button>
        </div>
      </div>
    );
  }

  // Preferences form
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquarePlus size={20} />
          Your Preferences
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Help us customize your graduation plan to your needs
        </p>
      </div>

      <form onSubmit={handleSubmitWithConcerns} className="space-y-4">
        {/* Work Status */}
        <TextField
          fullWidth
          select
          label="Work Status During Studies"
          value={workStatus}
          onChange={(e) => setWorkStatus(e.target.value as WorkStatus | '')}
          helperText="Will you be working while completing your degree?"
        >
          <MenuItem value="">
            <em>Select your work status</em>
          </MenuItem>
          <MenuItem value="not_working">{getWorkStatusLabel('not_working')}</MenuItem>
          <MenuItem value="part_time">{getWorkStatusLabel('part_time')}</MenuItem>
          <MenuItem value="full_time">{getWorkStatusLabel('full_time')}</MenuItem>
        </TextField>

        {/* Academic Priority */}
        <TextField
          fullWidth
          select
          label="Academic Priority"
          value={academicPriority}
          onChange={(e) => setAcademicPriority(e.target.value as AcademicPriority | '')}
          helperText="What's most important to you in your academic journey?"
        >
          <MenuItem value="">
            <em>Select your priority</em>
          </MenuItem>
          <MenuItem value="graduate_quickly">
            {getAcademicPriorityLabel('graduate_quickly')}
          </MenuItem>
          <MenuItem value="explore_options">
            {getAcademicPriorityLabel('explore_options')}
          </MenuItem>
          <MenuItem value="balanced">{getAcademicPriorityLabel('balanced')}</MenuItem>
        </TextField>

        {/* Other Concerns */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Other Concerns or Preferences"
          value={otherConcerns}
          onChange={(e) => setOtherConcerns(e.target.value)}
          placeholder="Any other preferences, constraints, or goals we should know about? (e.g., specific course interests, scheduling needs, etc.)"
          helperText="Optional - share any additional information"
        />

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2"
          >
            <ArrowRight size={18} />
            Continue with Preferences
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setHasAdditionalConcerns(null)}
            className="px-4 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
