import type { Meta, StoryObj } from '@storybook/react';
import { PivotOptionsPanel } from './pivot-options-panel';

const meta = {
    title: 'Pathfinder/PivotOptionsPanel',
    component: PivotOptionsPanel,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof PivotOptionsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockOptions = [
    {
        id: 'major-pivot',
        title: 'Major Pivot Exploration',
        category: 'major-pivot' as const,
        description: 'See paths that stretch beyond typical outcomes for your current major—leveraging transferable skills and supplemental learning.',
        cta: 'Explore unconventional paths',
        icon: 'sparkles' as const,
    },
    {
        id: 'minor-pivot',
        title: 'Adjacent Career Exploration',
        category: 'minor-pivot' as const,
        description: 'Discover roles and domains adjacent to your current academic focus that may require minimal additional coursework.',
        cta: 'Find adjacent opportunities',
        icon: 'lightbulb' as const,
    },
    {
        id: 'minor-audit',
        title: 'Near-Completion Minor Audit',
        category: 'minor-audit' as const,
        description: 'Check which minors you might already be close to finishing based on completed coursework and shared requirements.',
        cta: 'Audit potential minors',
        icon: 'cap' as const,
    },
    {
        id: 'compare-majors',
        title: 'Compare Majors',
        category: 'compare-majors' as const,
        description: 'Compare 2-4 majors side-by-side to see completion progress, courses that count, and what\'s still needed.',
        cta: 'Compare majors',
        icon: 'compare' as const,
    },
];

export const Default: Story = {
    args: {
        options: mockOptions,
    },
    decorators: [
        (Story) => (
            <div className="max-w-4xl mx-auto">
                <Story />
            </div>
        ),
    ],
};

export const SingleOption: Story = {
    args: {
        options: [mockOptions[0]],
    },
    decorators: [
        (Story) => (
            <div className="max-w-4xl mx-auto">
                <Story />
            </div>
        ),
    ],
};

export const Empty: Story = {
    args: {
        options: [],
    },
};
