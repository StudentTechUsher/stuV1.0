import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Mail, Plus, Trash2 } from 'lucide-react';

/**
 * Button component with multiple variants and sizes.
 * Built with Radix UI Slot and class-variance-authority for flexible styling.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent'],
      description: 'Visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
      description: 'Size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default primary button - the main call-to-action style
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

/**
 * Secondary button - for alternative actions
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

/**
 * Accent button - for special emphasis with subtle mint background
 */
export const Accent: Story = {
  args: {
    variant: 'accent',
    children: 'Accent Button',
  },
};

/**
 * Small button variant
 */
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

/**
 * Large button variant
 */
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

/**
 * Button with an icon
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail />
        Send Email
      </>
    ),
  },
};

/**
 * Icon-only button (square)
 */
export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <Plus />,
  },
};

/**
 * Disabled button state
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

/**
 * All button variants side-by-side for comparison
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Accent</Button>
    </div>
  ),
};

/**
 * All button sizes side-by-side for comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center flex-wrap">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Trash2 />
      </Button>
    </div>
  ),
};

/**
 * Buttons with different icon combinations
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button>
        <Plus />
        Add Item
      </Button>
      <Button variant="secondary">
        <Mail />
        Send Email
      </Button>
      <Button variant="accent" size="lg">
        <Trash2 />
        Delete
      </Button>
    </div>
  ),
};

/**
 * Dark mode demonstration
 */
export const DarkMode: Story = {
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <div className="w-[560px] rounded-xl border border-border bg-background p-8">
      <div className="flex gap-4 flex-wrap">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
      </div>
    </div>
  ),
};
