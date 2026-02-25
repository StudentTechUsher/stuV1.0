import type { Meta, StoryObj } from '@storybook/react';
import CourseFlowModal from './CourseFlowModal';
import type { ProgramOption } from '@/lib/chatbot/tools/programSelectionTool';

const meta = {
  title: 'Grad Plan/Create/CourseFlowModal',
  component: CourseFlowModal,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CourseFlowModal>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockProgram: ProgramOption = {
  id: 'cs-major',
  name: 'Computer Science',
  program_type: 'major',
  course_flow: {
    courses: [
      { id: 'c1', courseCode: 'CS 101', courseTitle: 'Intro to CS', credits: 3 },
      { id: 'c2', courseCode: 'CS 102', courseTitle: 'Data Structures', credits: 3 },
    ],
    connections: [],
  },
  requirements: {
    programRequirements: [
      {
        description: 'Complete 1 Course',
        requirementId: 1,
        courses: [{ code: 'CS 101', title: 'Intro to CS', credits: 3 }],
      },
    ],
  },
};

export const VersionB_ReadOnly: Story = {
  args: {
    open: true,
    onClose: () => {},
    program: mockProgram,
    readOnly: true,
  },
};

/**
 * Dark mode preview
 */
export const DarkMode: Story = {
  ...VersionB_ReadOnly,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    ...(VersionB_ReadOnly.parameters ?? {}),
    backgrounds: { default: 'dark' },
  },
};
