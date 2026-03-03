import type { Meta, StoryObj } from '@storybook/react';
import AgentTracePanel from '@/components/grad-plan/v3/AgentTracePanel';
import { mockV3TraceEvents } from '@/lib/chatbot/grad-plan/v3/fixtures';

const meta: Meta<typeof AgentTracePanel> = {
  title: 'Grad Plan/CreateV3/AgentTracePanel',
  component: AgentTracePanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    events: mockV3TraceEvents,
    levelFilter: 'all',
  },
};

export const WarnOnly: Story = {
  args: {
    events: mockV3TraceEvents,
    levelFilter: 'warn',
  },
};
