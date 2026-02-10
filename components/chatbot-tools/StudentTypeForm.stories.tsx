import type { Meta, StoryObj } from '@storybook/react';
import StudentTypeForm from './StudentTypeForm';

const meta = {
  title: 'Grad Plan/Create/StudentTypeForm',
  component: StudentTypeForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submit' },
  },
} satisfies Meta<typeof StudentTypeForm>;

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
