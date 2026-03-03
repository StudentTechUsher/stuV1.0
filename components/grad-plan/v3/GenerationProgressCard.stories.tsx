import type { Meta, StoryObj } from '@storybook/react';
import GenerationProgressCard from '@/components/grad-plan/v3/GenerationProgressCard';

const meta: Meta<typeof GenerationProgressCard> = {
  title: 'Grad Plan/CreateV3/GenerationProgressCard',
  component: GenerationProgressCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: {
    phase: 'major_fill',
    percent: 42,
    connected: true,
    message: 'Placing remaining major courses into terms.',
  },
};

export const Reconnecting: Story = {
  args: {
    phase: 'verify_heuristics',
    percent: 92,
    connected: false,
    message: 'Reconnecting to live updates...',
  },
};

export const Complete: Story = {
  args: {
    phase: 'completed',
    percent: 100,
    connected: true,
    message: 'Plan generated and persisted.',
  },
};
