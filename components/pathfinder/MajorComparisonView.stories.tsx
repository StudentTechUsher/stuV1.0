import type { Meta, StoryObj } from '@storybook/react';
import { MajorComparisonView } from './major-comparison-view';
import { PATHFINDER_COLORS } from './pathfinder-progress-ui';

const meta = {
    title: 'Pathfinder/MajorComparisonView',
    component: MajorComparisonView,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof MajorComparisonView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock Data
const mockComparison1 = {
    program: {
        id: 1,
        name: 'Computer Science',
        target_total_credits: 120,
    },
    requirementsSatisfied: 8,
    totalRequirements: 12,
    percentComplete: 67,
    auditDetails: [
        {
            requirementId: 101,
            description: 'Core Computer Science',
            satisfied: true,
            satisfiedCount: 3,
            totalCount: 3,
            type: 'courseList',
            appliedCourses: ['CS 101', 'CS 102', 'CS 201'],
            subResults: [],
        },
        {
            requirementId: 102,
            description: 'Mathematics Requirement',
            satisfied: false,
            satisfiedCount: 1,
            totalCount: 2,
            type: 'courseList',
            appliedCourses: ['MATH 101'],
            subResults: [],
            requiredCourses: [{ code: 'MATH 102', title: 'Calculus II' }],
        },
    ],
    coursesThatCount: [
        {
            course: { subject: 'CS', number: '101', title: 'Intro to CS', credits: 4 },
            satisfiesRequirements: ['101'],
            isDoubleCount: false,
        },
        {
            course: { subject: 'CS', number: '102', title: 'Data Structures', credits: 4 },
            satisfiesRequirements: ['101'],
            isDoubleCount: false,
        },
        {
            course: { subject: 'CS', number: '201', title: 'Algorithms', credits: 4 },
            satisfiesRequirements: ['101'],
            isDoubleCount: false,
        },
        {
            course: { subject: 'MATH', number: '101', title: 'Calculus I', credits: 4 },
            satisfiesRequirements: ['102'],
            isDoubleCount: true,
        },
    ],
    notUsed: [
        { subject: 'ART', number: '100', title: 'Art Appreciation', credits: 3 },
    ],
};

const mockComparison2 = {
    program: {
        id: 2,
        name: 'Data Science',
        target_total_credits: 120,
    },
    requirementsSatisfied: 5,
    totalRequirements: 14,
    percentComplete: 35,
    auditDetails: [
        {
            requirementId: 201,
            description: 'Core Data Science',
            satisfied: false,
            satisfiedCount: 1,
            totalCount: 4,
            type: 'courseList',
            appliedCourses: ['CS 101'],
            subResults: [],
            requiredCourses: [
                { code: 'DS 201', title: 'Intro to Data Science' },
                { code: 'STAT 301', title: 'Statistics' },
            ],
        },
    ],
    coursesThatCount: [
        {
            course: { subject: 'CS', number: '101', title: 'Intro to CS', credits: 4 },
            satisfiesRequirements: ['201'],
            isDoubleCount: false,
        },
    ],
    notUsed: [
        { subject: 'ART', number: '100', title: 'Art Appreciation', credits: 3 },
        { subject: 'CS', number: '201', title: 'Algorithms', credits: 4 },
    ],
};

const mockComparison3 = {
    program: {
        id: 3,
        name: 'Information Systems',
        target_total_credits: 120,
    },
    requirementsSatisfied: 10,
    totalRequirements: 12,
    percentComplete: 83,
    auditDetails: [],
    coursesThatCount: [],
    notUsed: [],
};

// @ts-ignore - Mocking complex type
const comparisons = [mockComparison1, mockComparison2];

export const Default: Story = {
    args: {
        // @ts-ignore
        comparisons: comparisons,
        loading: false,
        error: null,
    },
};

export const TwoMajors: Story = {
    args: {
        // @ts-ignore
        comparisons: [mockComparison1, mockComparison2],
        loading: false,
        error: null,
    },
};

export const ThreeMajors: Story = {
    args: {
        // @ts-ignore
        comparisons: [mockComparison1, mockComparison2, mockComparison3],
        loading: false,
        error: null,
    },
};

export const Loading: Story = {
    args: {
        comparisons: [],
        loading: true,
        error: null,
    },
};

export const ErrorState: Story = {
    args: {
        comparisons: [],
        loading: false,
        error: 'Failed to fetch comparison data. Please try again.',
        onRetry: () => alert('Retry clicked'),
    },
};

export const Empty: Story = {
    args: {
        comparisons: [],
        loading: false,
        error: null,
    },
};

export const DarkMode: Story = {
    args: Default.args,
    globals: {
        colorMode: 'dark',
    },
    parameters: {
        backgrounds: { default: 'dark' },
    },
    decorators: [
        (Story) => (
            <div className="rounded-xl border border-border bg-background p-4">
                <Story />
            </div>
        ),
    ],
};
