import type { Meta, StoryObj } from '@storybook/react';
import ActionFooter from '@/components/grad-plan/v3/ActionFooter';

const meta: Meta<typeof ActionFooter> = {
  title: 'Grad Plan/CreateV3/ActionFooter',
  component: ActionFooter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    primaryLabel: 'Continue',
    secondaryLabel: 'Back',
    helperText: 'Changes are saved automatically.',
  },
};

export const Loading: Story = {
  args: {
    primaryLabel: 'Generate Plan',
    primaryLoading: true,
    secondaryLabel: 'Cancel',
    helperText: 'Generation starts a durable background job.',
  },
};
