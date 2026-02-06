import type { Meta, StoryObj } from '@storybook/react';
import ConversationProgressSteps from './ConversationProgressSteps';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';

const meta = {
  title: 'Grad Plan/Create/ConversationProgressSteps',
  component: ConversationProgressSteps,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onStepClick: { action: 'step clicked' },
  },
} satisfies Meta<typeof ConversationProgressSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: {
    currentStep: ConversationStep.COURSE_SELECTION,
    completedSteps: [
      ConversationStep.PROFILE_CHECK,
      ConversationStep.TRANSCRIPT_CHECK,
      ConversationStep.PROGRAM_SELECTION,
    ],
  },
};

export const NearCompletion: Story = {
  args: {
    currentStep: ConversationStep.GENERATING_PLAN,
    completedSteps: [
      ConversationStep.PROFILE_CHECK,
      ConversationStep.TRANSCRIPT_CHECK,
      ConversationStep.PROGRAM_SELECTION,
      ConversationStep.COURSE_SELECTION,
      ConversationStep.CREDIT_DISTRIBUTION,
      ConversationStep.MILESTONES_AND_CONSTRAINTS,
    ],
  },
};
