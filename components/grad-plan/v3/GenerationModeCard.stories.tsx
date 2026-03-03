import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import GenerationModeCard from '@/components/grad-plan/v3/GenerationModeCard';
import type { GenerationMode } from '@/lib/chatbot/grad-plan/v3/types';

const meta: Meta<typeof GenerationModeCard> = {
  title: 'Grad Plan/CreateV3/GenerationModeCard',
  component: GenerationModeCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveModeCard() {
  const [value, setValue] = useState<GenerationMode | null>('automatic');
  return <GenerationModeCard value={value} onChange={setValue} />;
}

export const Interactive: Story = {
  render: () => <InteractiveModeCard />,
};

export const Disabled: Story = {
  args: {
    value: 'active_feedback',
    disabled: true,
  },
};
