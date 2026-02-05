import type { Meta, StoryObj } from '@storybook/react';
import { ProfileCheckStep } from './ProfileCheckStep';

const meta = {
  title: 'Grad Plan/Create/ProfileCheckStep',
  component: ProfileCheckStep,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'complete' },
    onCareerPathfinderClick: { action: 'career pathfinder' },
  },
} satisfies Meta<typeof ProfileCheckStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const completeStudentData = {
  est_grad_date: '2028-05-01',
  est_grad_term: 'Spring',
  admission_year: 2024,
  student_type: 'undergraduate' as const,
  career_goals: 'Data Science',
  is_transfer: 'freshman' as const,
};

const missingStudentData = {
  est_grad_date: null,
  est_grad_term: null,
  admission_year: null,
  student_type: null,
  career_goals: null,
  is_transfer: null,
};

export const CompleteProfile: Story = {
  args: {
    userId: 'user-123',
    onFetchStudentData: async () => completeStudentData,
    onUpdateStudentData: async () => {},
    onComplete: () => {},
  },
};

export const MissingFields: Story = {
  args: {
    userId: 'user-456',
    onFetchStudentData: async () => missingStudentData,
    onUpdateStudentData: async () => {},
    onComplete: () => {},
  },
};
