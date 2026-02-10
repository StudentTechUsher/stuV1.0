import type { Meta, StoryObj } from '@storybook/react';
import TranscriptReviewDisplay from './TranscriptReviewDisplay';

const meta = {
  title: 'Grad Plan/Create/TranscriptReviewDisplay',
  component: TranscriptReviewDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onConfirm: { action: 'confirm' },
  },
} satisfies Meta<typeof TranscriptReviewDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VersionB_ReadOnly: Story = {
  args: {
    courses: [
      { courseCode: 'ENG 101', title: 'Composition', credits: 3, grade: 'A', term: 'Fall 2024' },
      { courseCode: 'MATH 101', title: 'College Algebra', credits: 3, grade: 'B+', term: 'Fall 2024' },
    ],
    onConfirm: () => {},
    readOnly: true,
  },
};
