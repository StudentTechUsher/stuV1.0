import type { Meta, StoryObj } from '@storybook/react';
import { MilestonesAndConstraintsStep } from './MilestonesAndConstraintsStep';
import type { SemesterAllocation } from '@/lib/services/gradPlanGenerationService';

const meta = {
  title: 'Grad Plan/Create/MilestonesAndConstraintsStep',
  component: MilestonesAndConstraintsStep,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'complete' },
  },
} satisfies Meta<typeof MilestonesAndConstraintsStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const distribution: SemesterAllocation[] = [
  {
    term: 'Fall 2026',
    termType: 'primary',
    year: 2026,
    suggestedCredits: 15,
    minCredits: 12,
    maxCredits: 18,
  },
  {
    term: 'Spring 2027',
    termType: 'primary',
    year: 2027,
    suggestedCredits: 15,
    minCredits: 12,
    maxCredits: 18,
  },
  {
    term: 'Summer 2027',
    termType: 'secondary',
    year: 2027,
    suggestedCredits: 6,
    minCredits: 3,
    maxCredits: 9,
  },
];

export const Default: Story = {
  args: {
    distribution,
    studentType: 'undergraduate',
    onComplete: (data) => { console.log('onComplete:', data); },
    initialMilestones: [
      {
        id: 'milestone-1',
        type: 'internship',
        title: 'Summer Internship',
        timing: 'specific_term',
        term: 'Summer',
        year: 2027,
      },
    ],
    initialWorkStatus: 'part_time',
    initialNotes: 'Prefer lighter loads during summer due to travel.',
  },
};

export const VersionB_ReadOnly: Story = {
  args: {
    ...Default.args,
    readOnly: true,
    variant: 'versionB',
  },
};

export const VersionB_Validation: Story = {
  args: {
    ...Default.args,
    initialWorkStatus: undefined,
    variant: 'versionB',
  },
};

/**
 * Dark mode preview
 */
export const DarkMode: Story = {
  ...Default,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    ...(Default.parameters ?? {}),
    backgrounds: { default: 'dark' },
  },
};
