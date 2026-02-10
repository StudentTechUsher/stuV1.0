import type { Meta, StoryObj } from '@storybook/react';
import ConversationProgressSteps from './ConversationProgressSteps';
import { ConversationStep } from '@/lib/chatbot/grad-plan/types';

const meta = {
  title: 'Grad Plan/Create/ConversationProgressSteps',
  component: ConversationProgressSteps,
  parameters: {
    // Match the real /grad-plan/create sticky header presentation.
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onStepClick: { action: 'step clicked' },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-card border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-1 flex justify-center">
            <div className="w-full max-w-4xl">
              <Story />
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-[1920px] mx-auto px-6 py-2 w-full min-h-0 overflow-hidden">
          <div className="h-full rounded-xl border bg-muted/30" />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof ConversationProgressSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: {
    currentStep: ConversationStep.COURSE_SELECTION,
    completedSteps: [
      ConversationStep.PROFILE_CHECK,
      ConversationStep.PROGRAM_SELECTION,
    ],
  },
};

export const NearCompletion: Story = {
  args: {
    currentStep: ConversationStep.GENERATING_PLAN,
    completedSteps: [
      ConversationStep.PROFILE_CHECK,
      ConversationStep.PROGRAM_SELECTION,
      ConversationStep.COURSE_SELECTION,
      ConversationStep.CREDIT_DISTRIBUTION,
      ConversationStep.MILESTONES_AND_CONSTRAINTS,
    ],
  },
};

export const VersionB_AwaitingApproval: Story = {
  args: {
    currentStep: ConversationStep.CREDIT_DISTRIBUTION,
    completedSteps: [
      ConversationStep.PROFILE_CHECK,
      ConversationStep.PROGRAM_SELECTION,
      ConversationStep.COURSE_SELECTION,
    ],
    agentStatus: 'awaiting_approval',
    awaitingApprovalStep: ConversationStep.CREDIT_DISTRIBUTION,
  },
};
