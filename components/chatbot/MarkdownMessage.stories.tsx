import type { Meta, StoryObj } from '@storybook/react';
import MarkdownMessage from './MarkdownMessage';

const meta = {
  title: 'Grad Plan/Create/MarkdownMessage',
  component: MarkdownMessage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MarkdownMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'Here is a quick update:\n\n- **Courses**: 32 selected\n- *Credits*: 120\n- Next step: Review distribution',
  },
};

export const VersionB_DecisionCard: Story = {
  args: {
    content: 'I aligned your milestones with a balanced schedule and prioritized prerequisites to avoid delays.',
    decisionMeta: {
      title: 'Decision card',
      badges: ['Balanced load', 'Prereqs validated'],
      evidence: ['Transcript match', 'Program requirements', 'Milestone timing'],
    },
    showFeedback: true,
    feedbackReasons: ['Missing data', 'Needs adjustment', 'Not accurate', 'Other'],
  },
};
