import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';

/**
 * Input component for text entry.
 * Supports various HTML5 input types with consistent styling and accessibility features.
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'HTML input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic text input
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

/**
 * Input with a label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="email">Email Address</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

/**
 * Password input
 */
export const Password: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" placeholder="Enter password" />
    </div>
  ),
};

/**
 * Disabled input state
 */
export const Disabled: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="disabled-input">Disabled Field</Label>
      <Input
        id="disabled-input"
        disabled
        placeholder="This field is disabled"
      />
    </div>
  ),
};

/**
 * Input with error state (using aria-invalid)
 */
export const WithError: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="error-input">Email</Label>
      <Input
        id="error-input"
        type="email"
        placeholder="you@example.com"
        aria-invalid="true"
        defaultValue="invalid-email"
      />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
};

/**
 * Number input
 */
export const Number: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="credits">Course Credits</Label>
      <Input
        id="credits"
        type="number"
        placeholder="3"
        min={1}
        max={6}
      />
    </div>
  ),
};

/**
 * Search input
 */
export const Search: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="search">Search Courses</Label>
      <Input id="search" type="search" placeholder="Search..." />
    </div>
  ),
};

/**
 * Multiple inputs in a form layout
 */
export const FormLayout: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-form">Email</Label>
        <Input id="email-form" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="(555) 123-4567" />
      </div>
    </div>
  ),
};

/**
 * Dark mode demonstration
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <div className="dark p-8">
      <div className="w-[300px] space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dark-input">Course Name</Label>
          <Input id="dark-input" placeholder="Enter course name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dark-email">Email</Label>
          <Input
            id="dark-email"
            type="email"
            placeholder="student@university.edu"
          />
        </div>
      </div>
    </div>
  ),
};
