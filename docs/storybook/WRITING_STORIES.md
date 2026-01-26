# Writing Stories Guide

This guide covers best practices for writing Storybook stories for the Stu project.

## File Structure and Naming

### Colocate Stories with Components

Place story files next to their components:

```
components/ui/
├── button.tsx
├── button.stories.tsx        ✓ Good - next to component
├── card.tsx
└── card.stories.tsx
```

**Not** in a separate `stories/` directory:

```
components/ui/button.tsx
stories/button.stories.tsx    ✗ Bad - separated from component
```

### Naming Convention

- Story files must end with `.stories.tsx` or `.stories.ts`
- Use the same name as the component file
- Examples:
  - `button.tsx` → `button.stories.tsx`
  - `semester-card.tsx` → `semester-card.stories.tsx`
  - `CourseDialog.tsx` → `CourseDialog.stories.tsx`

## Story Structure Template

Here's the basic template for creating a new story:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './component-name';

/**
 * Brief description of what this component does.
 * Include key features or use cases.
 */
const meta = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered', // or 'fullscreen', 'padded'
  },
  tags: ['autodocs'],
  argTypes: {
    // Define interactive controls for props
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'accent'],
      description: 'Visual style variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the component is disabled',
    },
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - the most common use case
 */
export const Default: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
};

/**
 * Alternative variant or state
 */
export const Secondary: Story = {
  args: {
    children: 'Secondary button',
    variant: 'secondary',
  },
};

/**
 * Complex example with custom render
 */
export const WithIcon: Story = {
  render: () => (
    <ComponentName variant="primary">
      <Icon />
      Click me
    </ComponentName>
  ),
};
```

## Story Naming Categories

Organize stories using the `title` field:

### UI Components
```typescript
title: 'UI/Button'
title: 'UI/Card'
title: 'UI/Input'
```

### Feature Components
```typescript
title: 'Features/GradPlan/SemesterCard'
title: 'Features/Profile/ProfileCard'
title: 'Features/Transcript/CourseRow'
```

### Layout Components
```typescript
title: 'Layout/Header'
title: 'Layout/Sidebar'
title: 'Layout/Footer'
```

### Forms
```typescript
title: 'Forms/LoginForm'
title: 'Forms/CourseSelectionForm'
```

## Best Practices

### 1. Include JSDoc Comments

Add comments above the meta object and each story:

```typescript
/**
 * Button component with multiple variants and sizes.
 * Built with Radix UI Slot and class-variance-authority.
 */
const meta = {
  // ...
};

/**
 * Primary button - the main call-to-action style
 */
export const Primary: Story = {
  // ...
};
```

These comments appear in the autodocs panel.

### 2. Show All Variants

Create stories for every meaningful variant:

```typescript
export const Primary: Story = { /* ... */ };
export const Secondary: Story = { /* ... */ };
export const Accent: Story = { /* ... */ };
export const Disabled: Story = { /* ... */ };
```

Create comparison stories to show all variants together:

```typescript
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="accent">Accent</Button>
    </div>
  ),
};
```

### 3. Include Edge Cases

Don't just show the happy path. Include:

- Empty states
- Loading states
- Error states
- Disabled states
- Long text that might wrap
- Missing optional props

Example:

```typescript
export const LongText: Story = {
  args: {
    children: 'This is a very long button label that might wrap to multiple lines',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...',
  },
};

export const Error: Story = {
  args: {
    error: true,
    children: 'Error occurred',
  },
};
```

### 4. Use Descriptive Story Names

Use names that clearly describe the variant:

```typescript
// ✓ Good
export const WithLeftIcon: Story = { /* ... */ };
export const WithRightIcon: Story = { /* ... */ };
export const IconOnly: Story = { /* ... */ };

// ✗ Bad
export const Story1: Story = { /* ... */ };
export const Story2: Story = { /* ... */ };
export const Test: Story = { /* ... */ };
```

### 5. Leverage Interactive Controls

Use `argTypes` to make props interactive:

```typescript
argTypes: {
  // Select dropdown
  variant: {
    control: 'select',
    options: ['primary', 'secondary', 'accent'],
  },
  // Boolean checkbox
  disabled: {
    control: 'boolean',
  },
  // Text input
  label: {
    control: 'text',
  },
  // Number input
  credits: {
    control: { type: 'number', min: 0, max: 6 },
  },
  // Color picker
  backgroundColor: {
    control: 'color',
  },
  // Date picker
  dueDate: {
    control: 'date',
  },
  // Range slider
  progress: {
    control: { type: 'range', min: 0, max: 100, step: 1 },
  },
}
```

### 6. Add Dark Mode Stories

Test components in dark mode:

```typescript
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <div className="dark p-8">
      <ComponentName variant="primary">
        Dark mode example
      </ComponentName>
    </div>
  ),
};
```

### 7. Handle Client Components

If your component uses `"use client"`, the story will work as-is:

```typescript
// component.tsx
"use client"

export function Component() {
  const [state, setState] = useState('');
  // ...
}

// component.stories.tsx - works normally
export const Default: Story = {
  args: {},
};
```

### 8. Mock External Dependencies

For components that use external services (database, API), create mocks:

```typescript
import { ComponentName } from './component-name';

// Mock the service
const mockCourseData = {
  id: '1',
  name: 'CS 101',
  credits: 3,
};

export const Default: Story = {
  render: () => (
    <ComponentName course={mockCourseData} />
  ),
};
```

### 9. Use Play Functions for Interactions

Test user interactions with play functions:

```typescript
import { expect, userEvent, within } from '@storybook/test';

export const ClickButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await expect(button).toHaveTextContent('Clicked');
  },
};
```

## TypeScript Types

### Using Meta and StoryObj

Always use TypeScript types for type safety:

```typescript
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  // ...
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;
```

### Prop Types in ArgTypes

TypeScript will infer prop types from your component, but you can add descriptions:

```typescript
argTypes: {
  variant: {
    description: 'Visual style of the button',
    table: {
      type: { summary: 'string' },
      defaultValue: { summary: 'primary' },
    },
  },
}
```

## Layout Options

Control how stories are displayed:

```typescript
parameters: {
  layout: 'centered',  // Center in viewport (default for small components)
  // or
  layout: 'fullscreen', // Full width/height (for pages, layouts)
  // or
  layout: 'padded',     // Add padding around component
}
```

## Testing with Different Themes

### University Theme

Stories automatically support the university theme switcher in the toolbar. To test:

1. Run Storybook: `pnpm storybook`
2. Open your story
3. Select "University Theme" in the toolbar
4. Choose different presets (STU Mint, Custom Blue, Custom Purple)

Your component should adapt to the theme via CSS variables:

```css
/* Component uses CSS variables */
.button {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

### Background Options

Set custom backgrounds for specific stories:

```typescript
export const OnDarkBackground: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => <ComponentName />,
};
```

## Common Patterns

### Composition Components

For components with subcomponents (like Card):

```typescript
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './card';

export const FullCard: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Content goes here</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};
```

### Stateful Components

For components with state, use functional stories:

```typescript
import { useState } from 'react';

export const Controlled: Story = {
  render: function ControlledComponent() {
    const [value, setValue] = useState('');
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something..."
      />
    );
  },
};
```

### Grid Layouts

Show multiple instances together:

```typescript
export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>Card 1</Card>
      <Card>Card 2</Card>
      <Card>Card 3</Card>
      <Card>Card 4</Card>
      <Card>Card 5</Card>
      <Card>Card 6</Card>
    </div>
  ),
  parameters: {
    layout: 'padded', // Use padded layout for grids
  },
};
```

## Next Steps

- Read [COMPONENT_DEVELOPMENT.md](./COMPONENT_DEVELOPMENT.md) for the development workflow
- Explore the example stories in `components/ui/*.stories.tsx` for reference
- Check the [Storybook documentation](https://storybook.js.org/docs) for advanced features
