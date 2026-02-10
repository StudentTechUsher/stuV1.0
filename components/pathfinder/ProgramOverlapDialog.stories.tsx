import type { Meta, StoryObj } from '@storybook/react';
import { ProgramOverlapDialog } from './program-overlap-dialog';
import type { MajorProgramData } from './program-overlap-dialog';

const meta = {
    title: 'Pathfinder/ProgramOverlapDialog',
    component: ProgramOverlapDialog,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        onClose: { action: 'closed' },
    },
} satisfies Meta<typeof ProgramOverlapDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock Data
const mockMajor: MajorProgramData = {
    id: 'business-admin',
    name: 'Business Administration',
    requirements: [
        { courseCode: 'BUS 101', title: 'Intro to Business' },
        { courseCode: 'ACC 201', title: 'Accounting I' },
        { courseCode: 'ECO 101', title: 'Microeconomics' },
        { courseCode: 'MGT 301', title: 'Management Principles' },
        { courseCode: 'MKT 301', title: 'Marketing Principles' },
        { courseCode: 'ENG 101', title: 'Business Writing' }, // Overlap with GenEd
    ],
};

const mockCompletedCourses = [
    { code: 'ENG 101', title: 'College Writing', credits: 3 },
    { code: 'MATH 101', title: 'Calculus I', credits: 4 },
    { code: 'BUS 101', title: 'Intro to Business', credits: 3 }, // Direct match
    { code: 'ART 100', title: 'Art Appreciation', credits: 3 }, // Extra
];

export const Default: Story = {
    args: {
        open: true,
        major: mockMajor,
        completedCourses: mockCompletedCourses,
        matchedClasses: 2, // ENG 101 + BUS 101
        totalClassesInSemester: 4,
    },
};

export const HighOverlap: Story = {
    args: {
        open: true,
        major: mockMajor,
        completedCourses: [
            { code: 'BUS 101', title: 'Intro to Business', credits: 3 },
            { code: 'ACC 201', title: 'Accounting I', credits: 3 },
            { code: 'ECO 101', title: 'Microeconomics', credits: 3 },
            { code: 'MGT 301', title: 'Management Principles', credits: 3 },
            { code: 'ENG 101', title: 'Business Writing', credits: 3 },
        ],
        matchedClasses: 5,
        totalClassesInSemester: 5,
    },
};

export const NoOverlap: Story = {
    args: {
        open: true,
        major: mockMajor,
        completedCourses: [
            { code: 'PHYS 151', title: 'Physics I', credits: 4 },
            { code: 'CHEM 151', title: 'Chemistry I', credits: 4 },
        ],
        matchedClasses: 0,
        totalClassesInSemester: 2,
    },
};
