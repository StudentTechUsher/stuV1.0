import type { Meta, StoryObj } from '@storybook/react';
import ProfileUpdateForm from './ProfileUpdateForm';

const meta = {
  title: 'Grad Plan/Create/ProfileUpdateForm',
  component: ProfileUpdateForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submit' },
    onSkip: { action: 'skip' },
    onCareerPathfinderClick: { action: 'career pathfinder' },
  },
} satisfies Meta<typeof ProfileUpdateForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentValues: {
      est_grad_date: '2028-05-01',
      est_grad_sem: 'Spring',
      career_goals: 'Data Science',
      admission_year: 2024,
      is_transfer: 'freshman',
      selected_gen_ed_program_id: 1,
    },
    universityId: 1,
    hasActivePlan: false,
    onSubmit: () => {},
  },
};

export const VersionB_ReadOnly: Story = {
  args: {
    ...Default.args,
    readOnly: true,
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
