# Component Development Workflow

This guide covers the recommended workflow for developing components using Storybook.

## Development Workflow

### 1. Stories-First Approach

**Create stories BEFORE implementing complex functionality:**

```
1. Create component file with basic structure
2. Write stories for all variants/states
3. Develop component in Storybook
4. Test interactivity and edge cases
5. Integrate into application
```

### Example: Creating a New Button Component

#### Step 1: Create Basic Component

```typescript
// components/ui/new-button.tsx
export function NewButton({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}
```

#### Step 2: Write Stories

```typescript
// components/ui/new-button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { NewButton } from './new-button';

const meta = {
  title: 'UI/NewButton',
  component: NewButton,
  tags: ['autodocs'],
} satisfies Meta<typeof NewButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Click me',
    variant: 'secondary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
```

#### Step 3: Develop in Storybook

```bash
pnpm storybook
```

1. Open `http://localhost:6006`
2. Navigate to UI → NewButton
3. Use Controls panel to test props
4. Toggle dark mode to test theming
5. Iterate on the component implementation

#### Step 4: Implement Full Component

```typescript
// components/ui/new-button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export function NewButton({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

#### Step 5: Verify in Storybook

Check that all stories still work correctly with the full implementation.

#### Step 6: Integrate into Application

Now use the component in your Next.js pages/components:

```typescript
// app/some-page/page.tsx
import { NewButton } from '@/components/ui/new-button';

export default function SomePage() {
  return <NewButton variant="primary">Click me</NewButton>;
}
```

## TDD with Storybook

### Test-Driven Development Approach

1. **Write the story** (test case)
2. **See it fail** (component doesn't exist yet or is incomplete)
3. **Implement the component** until the story works
4. **Refactor** while keeping the story working

### Example: Form Validation

#### Step 1: Write Story for Error State

```typescript
export const WithError: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        aria-invalid="true"
        defaultValue="invalid-email"
      />
      <p className="text-sm text-destructive">Invalid email format</p>
    </div>
  ),
};
```

#### Step 2: Implement Validation Support

```typescript
// Add aria-invalid styling to input component
className={cn(
  "...",
  "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  className
)}
```

#### Step 3: Verify in Story

Check that the error state displays correctly in Storybook.

## Handling Server Components

### Client-Side Stories for Server Components

Most UI components in this project use `"use client"` (because they use Radix UI), so they work directly in Storybook.

For pure Server Components, you have two options:

#### Option 1: Import Directly (Storybook runs client-side anyway)

```typescript
// components/features/server-component.tsx
// No "use client" directive

export function ServerComponent({ data }: { data: string }) {
  return <div>{data}</div>;
}

// components/features/server-component.stories.tsx
import { ServerComponent } from './server-component';

export const Default: Story = {
  args: {
    data: 'Server data',
  },
};
```

This works because Storybook runs everything in the browser.

#### Option 2: Create Mocked Client Version

For components with server-only features (async, database calls):

```typescript
// components/features/server-component.tsx
export async function ServerComponent() {
  const data = await fetchFromDatabase();
  return <div>{data}</div>;
}

// components/features/server-component.stories.tsx
"use client"

// Create client version for Storybook
function ServerComponentClient({ data }: { data: string }) {
  return <div>{data}</div>;
}

export const Default: Story = {
  render: () => <ServerComponentClient data="Mocked data" />,
};
```

## Mocking Dependencies

### Context Providers

Wrap stories in necessary context providers:

```typescript
import { ThemeProvider } from '@/contexts/theme-provider';

export const WithTheme: Story = {
  render: () => (
    <ThemeProvider>
      <ComponentName />
    </ThemeProvider>
  ),
};
```

Or create a global decorator in `.storybook/preview.tsx`:

```typescript
export const decorators = [
  (Story) => (
    <ThemeProvider>
      <Story />
    </ThemeProvider>
  ),
];
```

### Database Queries

Create mock data instead of calling Supabase:

```typescript
const mockCourses = [
  { id: '1', name: 'CS 101', credits: 3 },
  { id: '2', name: 'MATH 201', credits: 4 },
];

export const WithCourses: Story = {
  render: () => <CourseList courses={mockCourses} />,
};
```

### API Calls

Use Mock Service Worker (MSW) for mocking API calls:

```bash
pnpm add -D msw msw-storybook-addon
```

```typescript
// .storybook/preview.tsx
import { initialize, mswLoader } from 'msw-storybook-addon';

initialize();

export const loaders = [mswLoader];
```

```typescript
// component.stories.tsx
import { http, HttpResponse } from 'msw';

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/courses', () => {
          return HttpResponse.json([
            { id: '1', name: 'CS 101' },
          ]);
        }),
      ],
    },
  },
};
```

## Interactive Testing

### Using Play Functions

Test user interactions automatically:

```typescript
import { expect, userEvent, within } from '@storybook/test';

export const FillForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find elements
    const emailInput = canvas.getByLabelText('Email');
    const submitButton = canvas.getByRole('button', { name: /submit/i });

    // Simulate user actions
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.click(submitButton);

    // Assert results
    await expect(canvas.getByText('Success')).toBeInTheDocument();
  },
};
```

### Testing Keyboard Navigation

```typescript
export const KeyboardNav: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Tab through elements
    await userEvent.tab();
    await expect(document.activeElement).toBe(canvas.getByRole('button'));

    // Press Enter
    await userEvent.keyboard('{Enter}');

    // Assert action occurred
    await expect(canvas.getByText('Clicked')).toBeInTheDocument();
  },
};
```

## Visual Regression Testing (Future)

Storybook can be integrated with visual regression testing tools:

### Playwright Visual Testing

```bash
pnpm add -D @playwright/test
```

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test('button variants match snapshots', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=ui-button--all-variants');
  await expect(page).toHaveScreenshot('button-variants.png');
});
```

### Chromatic (Recommended)

Chromatic is built specifically for Storybook visual testing:

1. Sign up at https://www.chromatic.com
2. Install: `pnpm add -D chromatic`
3. Run: `pnpm dlx chromatic --project-token=YOUR_TOKEN`

This creates visual snapshots of every story and detects UI changes automatically.

## Performance Optimization

### Code Splitting in Stories

Large stories can slow down Storybook. Use dynamic imports:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./heavy-component'));

export const WithHeavyComponent: Story = {
  render: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  ),
};
```

### Limiting Stories

Don't create 50 stories for a single component. Focus on:

- Key variants (primary, secondary, etc.)
- Key states (default, disabled, error, loading)
- Edge cases (empty, overflow, etc.)
- One "all variants" comparison story

## Integration with Existing Code

### Using Components from Feature Directories

Components in `components/` subdirectories work the same way:

```typescript
// components/grad-plan/semester-card.tsx
export function SemesterCard({ semester }: { semester: Semester }) {
  return <div>{semester.name}</div>;
}

// components/grad-plan/semester-card.stories.tsx
import { SemesterCard } from './semester-card';

const mockSemester = {
  id: '1',
  name: 'Fall 2024',
  credits: 15,
};

export const Default: Story = {
  render: () => <SemesterCard semester={mockSemester} />,
};
```

### Testing with Real-ish Data

Create realistic mock data that matches production:

```typescript
// lib/mocks/course-data.ts
export const mockCourses = [
  {
    id: 'a1b2c3',
    code: 'CS 101',
    name: 'Introduction to Computer Science',
    credits: 3,
    prerequisites: [],
    corequisites: [],
  },
  {
    id: 'd4e5f6',
    code: 'MATH 201',
    name: 'Calculus I',
    credits: 4,
    prerequisites: ['MATH 101'],
    corequisites: [],
  },
];

// component.stories.tsx
import { mockCourses } from '@/lib/mocks/course-data';

export const Default: Story = {
  render: () => <CourseList courses={mockCourses} />,
};
```

## Workflow Tips

### Hot Reload

Storybook watches for file changes and reloads automatically:

1. Edit component file → Storybook updates
2. Edit story file → Storybook updates
3. Edit CSS/Tailwind → Storybook updates

### Multiple Browsers

Open Storybook in multiple browsers to test cross-browser compatibility:

- Chrome: http://localhost:6006
- Firefox: http://localhost:6006
- Safari: http://localhost:6006

### Keyboard Shortcuts

- `S` - Show sidebar
- `D` - Toggle dark mode
- `F` - Toggle fullscreen
- `A` - Show addons panel
- `/` - Search stories

### Sharing with Team

#### Local Network

Share Storybook with teammates on your network:

```bash
pnpm storybook -- --host 0.0.0.0
```

Then others can access via your IP: `http://192.168.1.X:6006`

#### Deploy to Vercel

Deploy static Storybook build:

```bash
pnpm storybook:build
cd storybook-static
vercel deploy
```

## Next Steps

- Start creating stories for existing components in `components/ui/`
- Experiment with interactive controls and play functions
- Set up visual regression testing with Chromatic (optional)
- Integrate Storybook into your daily development workflow
