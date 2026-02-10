
import type { Meta, StoryObj } from '@storybook/react';
import { AdjacentCareerForm } from './adjacent-career-form';

const meta = {
    title: 'Pathfinder/AdjacentCareerForm',
    component: AdjacentCareerForm,
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
} satisfies Meta<typeof AdjacentCareerForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        currentMajor: 'Psychology',
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

export const WithoutCurrentMajor: Story = {
    args: {
        currentMajor: null,
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
