import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Button } from './button';

/**
 * Card component with composable subcomponents.
 * Use Card as a container with CardHeader, CardTitle, CardDescription, CardContent, and CardFooter.
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with all sections
 */
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Course Information</CardTitle>
        <CardDescription>Details about your selected course</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          This is the main content area of the card. You can put any content
          here including text, forms, or other components.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="primary" size="sm">
          Save
        </Button>
        <Button variant="secondary" size="sm">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card without footer
 */
export const NoFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Semester Schedule</CardTitle>
        <CardDescription>Fall 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Credits:</span>
            <span className="font-semibold">15</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Courses:</span>
            <span className="font-semibold">5</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Required:</span>
            <span className="font-semibold">3</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with custom styling using Tailwind classes
 */
export const CustomStyling: Story = {
  render: () => (
    <Card className="w-[400px] bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-primary">Featured Course</CardTitle>
        <CardDescription>Highlighted for this semester</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">CS 301 - Data Structures</p>
        <p className="text-xs text-muted-foreground mt-2">
          Learn fundamental data structures and algorithms essential for software
          development.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="accent" size="sm">
          Enroll Now
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Multiple cards in a grid layout
 */
export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Fall 2024</CardTitle>
          <CardDescription>15 credits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">5 courses planned</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Spring 2025</CardTitle>
          <CardDescription>16 credits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">6 courses planned</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fall 2025</CardTitle>
          <CardDescription>14 credits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">4 courses planned</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Spring 2026</CardTitle>
          <CardDescription>15 credits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">5 courses planned</p>
        </CardContent>
      </Card>
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
    <div className="rounded-xl border border-border bg-background p-8">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Graduation Plan</CardTitle>
          <CardDescription>Your path to graduation</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Track your progress towards degree completion with personalized
            planning tools.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="primary" size="sm">
            View Plan
          </Button>
        </CardFooter>
      </Card>
    </div>
  ),
};
