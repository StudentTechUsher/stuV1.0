import type { Meta, StoryObj } from '@storybook/react';
import type { User } from '@supabase/supabase-js';
import CreatePlanClient from './create-plan-client';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';

const meta = {
  title: 'Grad Plan/Create/CreatePlanClient',
  component: CreatePlanClient,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CreatePlanClient>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockUser = {
  id: 'user-123',
  email: 'student@example.com',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
} as User;

const academicTerms: AcademicTermsConfig = {
  terms: {
    primary: [
      { id: 'fall', label: 'Fall' },
      { id: 'spring', label: 'Spring' },
    ],
    secondary: [
      { id: 'summer', label: 'Summer' },
    ],
  },
  system: 'semester_with_terms',
  ordering: ['fall', 'spring', 'summer'],
  academic_year_start: 'fall',
};

export const VersionB: Story = {
  render: () => (
    <CreatePlanClient
      user={mockUser}
      studentProfile={{
        id: 'profile-123',
        university_id: 1,
        est_grad_date: '2028-05-01',
        est_grad_sem: 'Spring',
        career_goals: 'Data Science',
        student_type: 'undergraduate',
        admission_year: 2024,
        is_transfer: 'freshman',
      }}
      hasCourses
      hasActivePlan={false}
      academicTerms={academicTerms}
      mockMode
      variant="versionB"
      mockActiveTool="generate_plan_confirmation"
      mockToolData={{
        academicTerms,
        lastCompletedTerm: 'Spring 2026',
        preferredStartTerms: ['Fall'],
      }}
      mockAgent={{
        status: 'awaiting_approval',
        lastUpdated: new Date().toISOString(),
        logs: [
          {
            id: 'log-1',
            ts: new Date().toISOString(),
            type: 'tool',
            label: 'Parsed transcript',
            detail: 'Detected 42 completed credits',
            status: 'ok',
          },
          {
            id: 'log-2',
            ts: new Date().toISOString(),
            type: 'decision',
            label: 'Draft schedule',
            detail: 'Balanced load with summer term',
            status: 'warn',
          },
        ],
        checks: [
          {
            id: 'check-1',
            label: 'Prerequisites satisfied',
            status: 'ok',
            evidence: ['Transcript match', 'Program requirements'],
          },
          {
            id: 'check-2',
            label: 'Credit load within range',
            status: 'warn',
            evidence: ['15–18 credits', 'Summer included'],
          },
        ],
      }}
      mockMessages={[
        {
          role: 'assistant',
          content: 'I created a draft schedule and flagged the items that need your approval.',
          timestamp: new Date(),
          decisionMeta: {
            title: 'Decision card',
            badges: ['Balanced load', 'Milestones aligned'],
            evidence: ['Transcript match', 'Program requirements', 'Constraint check'],
          },
          showFeedback: true,
          feedbackReasons: ['Missing data', 'Needs adjustment', 'Not accurate', 'Other'],
        },
      ]}
    />
  ),
};
