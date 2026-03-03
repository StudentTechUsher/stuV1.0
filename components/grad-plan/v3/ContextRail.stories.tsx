import type { Meta, StoryObj } from '@storybook/react';
import ContextRail from '@/components/grad-plan/v3/ContextRail';

const meta: Meta<typeof ContextRail> = {
  title: 'Grad Plan/CreateV3/ContextRail',
  component: ContextRail,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const MixedStatuses: Story = {
  args: {
    sections: [
      {
        id: 'profile',
        title: 'Profile',
        status: 'complete',
        summary: 'Undergraduate profile confirmed',
      },
      {
        id: 'transcript',
        title: 'Transcript',
        status: 'in_progress',
        summary: 'Using current transcript (42 completed credits)',
      },
      {
        id: 'distribution',
        title: 'Distribution',
        status: 'missing',
        summary: 'No strategy selected',
      },
    ],
  },
};
