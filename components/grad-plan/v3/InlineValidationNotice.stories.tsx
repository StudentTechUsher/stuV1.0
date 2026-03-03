import type { Meta, StoryObj } from '@storybook/react';
import InlineValidationNotice from '@/components/grad-plan/v3/InlineValidationNotice';

const meta: Meta<typeof InlineValidationNotice> = {
  title: 'Grad Plan/CreateV3/InlineValidationNotice',
  component: InlineValidationNotice,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    tone: 'info',
    title: 'Ready for review',
    message: 'Selections are synced to the context rail.',
  },
};

export const Warning: Story = {
  args: {
    tone: 'warn',
    title: 'One requirement bucket is incomplete',
    message: 'Add at least one gen-ed course selection before continuing.',
  },
};

export const Error: Story = {
  args: {
    tone: 'error',
    title: 'Submission failed',
    message: 'Try again or use retry to resume from the last checkpoint.',
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    title: 'Saved',
    message: 'Context event stored successfully.',
  },
};
