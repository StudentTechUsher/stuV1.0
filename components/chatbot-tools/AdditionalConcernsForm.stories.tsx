import type { Meta, StoryObj } from '@storybook/react';
import AdditionalConcernsForm from './AdditionalConcernsForm';

const meta = {
  title: 'Grad Plan/Create/AdditionalConcernsForm',
  component: AdditionalConcernsForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submit' },
  },
} satisfies Meta<typeof AdditionalConcernsForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: () => {},
  },
};

export const VersionB_ReadOnly: Story = {
  args: {
    onSubmit: () => {},
    readOnly: true,
  },
};

/**
 * Dark mode preview
 */
export const DarkMode: Story = {
  ...Default,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    ...(Default.parameters ?? {}),
    backgrounds: { default: 'dark' },
  },
};
