import type { Meta, StoryObj } from '@storybook/react';
import CareerSuggestionsDisplay from './CareerSuggestionsDisplay';

const meta = {
  title: 'Grad Plan/Create/CareerSuggestionsDisplay',
  component: CareerSuggestionsDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectCareer: { action: 'select career' },
  },
} satisfies Meta<typeof CareerSuggestionsDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelectCareer: (careerTitle: string) => {
      console.log('Selected career:', careerTitle);
    },
    suggestions: {
      summary: 'You enjoy problem-solving and working with data, with a preference for collaborative environments.',
      careers: [
        {
          title: 'Data Scientist',
          match_score: 92,
          reason: 'Strong alignment with your interest in analytics and modeling complex systems.',
          job_growth: 'Much faster than average',
          median_salary: '$120,000',
          related_programs: ['Computer Science', 'Statistics'],
        },
        {
          title: 'Product Manager',
          match_score: 78,
          reason: 'Combines your people-facing collaboration with structured planning and strategy.',
          job_growth: 'Faster than average',
          median_salary: '$110,000',
          related_programs: ['Business', 'Information Systems'],
        },
        {
          title: 'UX Researcher',
          match_score: 70,
          reason: 'Matches your curiosity and interest in understanding how people interact with products.',
          job_growth: 'Faster than average',
          median_salary: '$95,000',
          related_programs: ['Psychology', 'Human-Computer Interaction'],
        },
      ],
    },
  },
};

export const VersionB_ReadOnly: Story = {
  args: {
    ...Default.args,
    readOnly: true,
  },
};
