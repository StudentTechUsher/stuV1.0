import type { Meta, StoryObj } from '@storybook/react';
import { CourseHistoryList } from './course-history-list';

const meta = {
    title: 'Pathfinder/CourseHistoryList',
    component: CourseHistoryList,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        maxHeight: { control: 'text' },
    },
} satisfies Meta<typeof CourseHistoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockCourses = [
    {
        id: '1',
        code: 'CS 101',
        title: 'Introduction to Computer Science',
        credits: 4,
        term: 'Fall 2023',
        grade: 'A',
        tags: ['Core', 'Introductory'],
    },
    {
        id: '2',
        code: 'MATH 101',
        title: 'Calculus I',
        credits: 4,
        term: 'Fall 2023',
        grade: 'B+',
        tags: ['Math', 'Core'],
    },
    {
        id: '3',
        code: 'ENG 101',
        title: 'College Writing',
        credits: 3,
        term: 'Spring 2024',
        grade: 'A-',
        tags: ['GenEd'],
    },
    {
        id: '4',
        code: 'PHYS 151',
        title: 'General Physics I',
        credits: 4,
        term: 'Spring 2024',
        grade: 'B',
        tags: ['Science', 'Lab'],
    },
    {
        id: '5',
        code: 'ART 100',
        title: 'Art Appreciation',
        credits: 3,
        term: 'Summer 2024',
        grade: 'A',
        tags: ['Elective'],
    },
];

export const Default: Story = {
    args: {
        courses: mockCourses,
        maxHeight: 400,
    },
    decorators: [
        (Story) => (
            <div className="w-[400px]">
                <Story />
            </div>
        ),
    ],
};

export const Empty: Story = {
    args: {
        courses: [],
        maxHeight: 400,
    },
    decorators: [
        (Story) => (
            <div className="w-[400px]">
                <Story />
            </div>
        ),
    ],
};

export const WithManyCourses: Story = {
    args: {
        courses: [
            ...mockCourses,
            ...mockCourses.map(c => ({ ...c, id: `copy-${c.id}`, code: `${c.code} (Copy)` })),
            ...mockCourses.map(c => ({ ...c, id: `copy2-${c.id}`, code: `${c.code} (Copy 2)` })),
        ],
        maxHeight: 400,
    },
    decorators: [
        (Story) => (
            <div className="w-[400px]">
                <Story />
            </div>
        ),
    ],
};
