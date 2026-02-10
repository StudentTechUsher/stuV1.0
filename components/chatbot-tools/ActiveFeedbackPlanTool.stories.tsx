import type { Meta, StoryObj } from '@storybook/react';
import ActiveFeedbackPlanTool from './ActiveFeedbackPlanTool';
import type { SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

const meta = {
  title: 'Grad Plan/Create/ActiveFeedbackPlanTool',
  component: ActiveFeedbackPlanTool,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'complete' },
  },
} satisfies Meta<typeof ActiveFeedbackPlanTool>;

export default meta;

type Story = StoryObj<typeof meta>;

const suggestedDistribution: SemesterAllocation[] = [
  { term: 'Fall 2026', termType: 'primary', year: 2026, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
  { term: 'Spring 2027', termType: 'primary', year: 2027, suggestedCredits: 15, minCredits: 12, maxCredits: 18 },
];

export const VersionB_ReadOnly: Story = {
  args: {
    courseData: [{ code: 'CS 101', title: 'Intro to CS', credits: 3 }],
    suggestedDistribution,
    hasTranscript: true,
    onComplete: () => {},
    readOnly: true,
  },
};
