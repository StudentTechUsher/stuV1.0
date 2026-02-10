import type { Meta, StoryObj } from '@storybook/react';
import CourseRecommendationPanel from './CourseRecommendationPanel';

const meta = {
  title: 'Grad Plan/Create/CourseRecommendationPanel',
  component: CourseRecommendationPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onCourseSelect: { action: 'select course' },
  },
} satisfies Meta<typeof CourseRecommendationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VersionB_ReadOnly: Story = {
  args: {
    dropdownCount: 4,
    recommendations: [
      { courseId: 'CS101', courseCode: 'CS 101', courseTitle: 'Intro to CS', score: 3, matchReasons: ['Core major'] },
      { courseId: 'CS102', courseCode: 'CS 102', courseTitle: 'Data Structures', score: 2, matchReasons: ['Prerequisite'] },
      { courseId: 'CS201', courseCode: 'CS 201', courseTitle: 'Algorithms', score: 2, matchReasons: ['Requirement'] },
      { courseId: 'CS250', courseCode: 'CS 250', courseTitle: 'Systems', score: 1, matchReasons: ['Elective'] },
    ],
    onCourseSelect: () => {},
    readOnly: true,
  },
};
