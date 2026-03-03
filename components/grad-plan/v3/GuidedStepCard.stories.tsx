import type { Meta, StoryObj } from '@storybook/react';
import GuidedStepCard from '@/components/grad-plan/v3/GuidedStepCard';

const meta: Meta<typeof GuidedStepCard> = {
  title: 'Grad Plan/CreateV3/GuidedStepCard',
  component: GuidedStepCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stepNumber: 3,
    totalSteps: 7,
    title: 'Select Programs',
    description: 'Choose the major, minor, and optional focus tracks you want in this plan.',
    helperText: 'Selections sync to context immediately.',
    primaryAction: {
      label: 'Continue',
    },
    secondaryAction: {
      label: 'Back',
    },
    children: (
      <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-600">
        Program selection content placeholder
      </div>
    ),
  },
};

export const WithValidationNotice: Story = {
  args: {
    ...Default.args,
    notice: {
      tone: 'warn',
      title: 'Missing one required choice',
      message: 'Pick at least one major program before continuing.',
    },
  },
};
