import type { Meta, StoryObj } from '@storybook/react';
import { MajorPivotForm } from './major-pivot-form';

const meta = {
    title: 'Pathfinder/MajorPivotForm',
    component: MajorPivotForm,
    parameters: {
        layout: 'padded',
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    argTypes: {
        onSubmit: { action: 'submitted' },
        onCancel: { action: 'cancelled' },
    },
} satisfies Meta<typeof MajorPivotForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        currentMajor: 'Computer Science',
        onSubmit: () => { },
        onCancel: () => { },
    },
    decorators: [
        (Story) => (
            <div className="w-[500px] border p-4 rounded-lg bg-gray-50/50">
                <Story />
            </div>
        ),
    ],
};

export const WithMatchStats: Story = {
    args: {
        currentMajor: 'Biology',
        matchedClasses: 3,
        totalClassesInSemester: 4,
        selectedSemesterName: 'Fall 2023',
        onSubmit: () => { },
        onCancel: () => { },
    },
    decorators: [
        (Story) => (
            <div className="w-[500px] border p-4 rounded-lg bg-gray-50/50">
                <Story />
            </div>
        ),
    ],
};

export const SubmittingState: Story = {
    args: {
        currentMajor: 'Undeclared',
        onSubmit: async () => new Promise((resolve) => setTimeout(resolve, 2000)),
        onCancel: () => { },
    },
    decorators: [
        (Story) => (
            <div className="w-[500px] border p-4 rounded-lg bg-gray-50/50">
                <Story />
            </div>
        ),
    ],
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
            <div className="w-[520px] rounded-xl border border-border bg-background p-4">
                <Story />
            </div>
        ),
    ],
};
