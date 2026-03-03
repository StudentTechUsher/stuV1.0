import type { Meta, StoryObj } from '@storybook/react';
import ProgramSuggestionsDisplay from './ProgramSuggestionsDisplay';

const meta: Meta<typeof ProgramSuggestionsDisplay> = {
  title: 'Grad Plan/Create/ProgramSuggestionsDisplay',
  component: ProgramSuggestionsDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectProgram: { action: 'select programs' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelectProgram: (programs) => {
      console.log('Selected programs:', programs);
    },
    suggestions: [
      {
        program_name: 'Computer Science',
        program_type: 'major',
        match_score: 91,
        reason: 'Strong fit for your interest in software and data analysis.',
        career_alignment: 'Aligns well with software engineering and data science roles.',
        typical_courses: ['CS 101', 'CS 240', 'CS 350', 'CS 450'],
        estimated_credits: 60,
      },
      {
        program_name: 'Statistics',
        program_type: 'minor',
        match_score: 77,
        reason: 'Enhances your analytical strengths and pairs well with CS.',
        career_alignment: 'Supports data analytics and research-focused roles.',
        typical_courses: ['STAT 121', 'STAT 230', 'STAT 321'],
        estimated_credits: 18,
      },
      {
        program_name: 'Business Analytics',
        program_type: 'emphasis',
        match_score: 68,
        reason: 'Balances your technical interests with business decision-making.',
        career_alignment: 'Useful for product, analytics, and consulting paths.',
        typical_courses: ['BA 201', 'BA 320', 'BA 410'],
        estimated_credits: 12,
      },
    ],
  },
};

export const VersionB_ReadOnly: Story = {
  args: Default.args,
  parameters: {
    layout: 'fullscreen',
  },
  render: (_args, { args }) => (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ProgramSuggestionsDisplay
        {...args}
        readOnly
        variant="versionB"
      />
    </div>
  ),
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
