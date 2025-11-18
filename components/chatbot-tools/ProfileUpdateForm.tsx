'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { CheckCircle2, Compass } from 'lucide-react';
import Link from 'next/link';
import { ProfileUpdateInput } from '@/lib/chatbot/tools/profileUpdateTool';

interface ProfileUpdateFormProps {
  currentValues: {
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
  };
  onSubmit: (data: ProfileUpdateInput) => void;
  onSkip?: () => void;
  onCareerPathfinderClick?: () => void;
}

const SEMESTER_OPTIONS = ['Winter', 'Spring', 'Summer', 'Fall'] as const;

export default function ProfileUpdateForm({
  currentValues,
  onSubmit,
  onSkip,
  onCareerPathfinderClick,
}: Readonly<ProfileUpdateFormProps>) {
  const [estGradDate, setEstGradDate] = useState(currentValues.est_grad_date || '');
  const [estGradSem, setEstGradSem] = useState<string>(currentValues.est_grad_sem || '');
  const [careerGoals, setCareerGoals] = useState(currentValues.career_goals || '');

  const hasCurrentValues = !!(
    currentValues.est_grad_date ||
    currentValues.est_grad_sem ||
    currentValues.career_goals
  );

  const hasChanges =
    estGradDate !== (currentValues.est_grad_date || '') ||
    estGradSem !== (currentValues.est_grad_sem || '') ||
    careerGoals !== (currentValues.career_goals || '');

  const isValid = estGradDate && estGradSem && careerGoals.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      estGradDate: estGradDate || null,
      estGradSem: (estGradSem as ProfileUpdateInput['estGradSem']) || null,
      careerGoals: careerGoals.trim() || null,
    });
  };

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Profile Information</h3>
        <p className="text-sm text-muted-foreground">
          {hasCurrentValues
            ? 'Review and update your profile information if needed'
            : 'Please provide your profile information to get started'}
        </p>
      </div>

      {/* Pathfinder Help Button */}
      {onCareerPathfinderClick && (
        <div className="flex justify-center mb-4">
          <Button
            type="button"
            onClick={onCareerPathfinderClick}
            variant="outline"
            className="gap-2"
          >
            <Compass size={18} />
            Need help finding your career path?
          </Button>
        </div>
      )}

      {/* Show current values if they exist */}
      {hasCurrentValues && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">Current Values:</p>
          <div className="space-y-1">
            {currentValues.est_grad_date && (
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Graduation Date:</span>{' '}
                  {new Date(currentValues.est_grad_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {currentValues.est_grad_sem && (
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Graduation Semester:</span>{' '}
                  {currentValues.est_grad_sem}
                </p>
              </div>
            )}
            {currentValues.career_goals && (
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Career Goals:</span>{' '}
                  {currentValues.career_goals}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-1">
        {/* Graduation Date */}
        <TextField
          fullWidth
          type="date"
          label="Estimated Graduation Date"
          value={estGradDate}
          onChange={(e) => setEstGradDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          required
          helperText=" "
        />
        <br />

        {/* Graduation Semester */}
        <TextField
          fullWidth
          select
          label="Estimated Graduation Semester"
          value={estGradSem}
          onChange={(e) => setEstGradSem(e.target.value)}
          required
          helperText=" "
        >
          <MenuItem value="">
            <em>Select a semester</em>
          </MenuItem>
          {SEMESTER_OPTIONS.map((semester) => (
            <MenuItem key={semester} value={semester}>
              {semester}
            </MenuItem>
          ))}
        </TextField>

        {/* Career Goals */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Career Goals"
          value={careerGoals}
          onChange={(e) => setCareerGoals(e.target.value)}
          required
          placeholder="What career are you pursuing? (e.g., Software Engineer, Data Scientist, etc.)"
          helperText="Describe your target career or professional goals"
        />

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isValid}
            className="flex-1 bg-[#0a1f1a] hover:bg-[#043322]"
          >
            {hasCurrentValues && hasChanges ? 'Update Profile' : 'Continue'}
          </Button>

          {hasCurrentValues && onSkip && (
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Keep Current Values
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
